import pg from "pg";
import { readFileSync } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("ERROR: set DATABASE_URL (Neon connection string) before running.");
  process.exit(2);
}

const schemaPath = process.argv[2] ?? "neon/adapted_schema.sql";
const sql = readFileSync(schemaPath, "utf8");

// --- SQL-aware statement splitter (handles --, /* */, '...', "...", $$/$tag$) ---
function splitStatements(text) {
  const stmts = [];
  let buf = "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === "-" && next === "-") { while (i < text.length && text[i] !== "\n") i++; continue; }
    if (ch === "/" && next === "*") { i += 2; while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++; i += 2; continue; }
    const q = (ch === "'" || ch === '"') ? ch : null;
    if (q) {
      buf += ch; i++;
      while (i < text.length) {
        buf += text[i];
        if (text[i] === q) {
          if (text[i + 1] === q) { buf += text[i + 1]; i += 2; continue; }
          i++; break;
        }
        i++;
      }
      continue;
    }
    if (ch === "$") {
      let j = i + 1; let tag = "$";
      if (text[j] === "$") { tag = "$$"; j = i + 2; }
      else {
        while (j < text.length && text[j] !== "$" && text[j] !== "\n") { tag += text[j]; j++; }
        if (text[j] === "$") { tag += "$"; j++; } else { buf += ch; i++; continue; }
      }
      const close = tag.slice(0, -1) + "$";
      buf += tag; i = j;
      while (i < text.length) {
        const idx = text.indexOf(close, i);
        if (idx === -1) { buf += text.slice(i); i = text.length; break; }
        buf += text.slice(i, idx + close.length); i = idx + close.length; break;
      }
      continue;
    }
    if (ch === ";") { const s = buf.trim(); if (s) stmts.push(s); buf = ""; i++; continue; }
    buf += ch; i++;
  }
  const tail = buf.trim(); if (tail) stmts.push(tail);
  return stmts;
}

const NON_TX_RE = /^\s*(create\s+extension|create\s+role|create\s+type)\b/i;
const benign = /already exists|duplicate|already defined|relation .* already exists|column .* already exists|policy .* already exists|function .* already exists/i;
const short = (s) => s.replace(/\s+/g, " ").slice(0, 80);

(async () => {
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const all = splitStatements(sql);
  const pre = [];
  const tx = [];
  for (const s of all) {
    if (NON_TX_RE.test(s)) pre.push(s);
    else tx.push(s);
  }
  console.log(`Parsed ${all.length} statements (${pre.length} non-tx, ${tx.length} tx).`);

  try {
    await client.connect();

    // Pre-phase (autocommit): extensions, roles, types. Tolerate "already exists".
    for (const s of pre) {
      try {
        await client.query(s);
        console.log("pre ok:    " + short(s));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/^\s*create\s+type/i.test(s) && /already exists/i.test(msg)) {
          // ensure all enum values referenced by this type exist
          const m = s.match(/create\s+type\s+([^\s]+)\s+as\s+enum\s*\(([\s\S]*)\)/i);
          if (m) {
            for (const v of [...m[2].matchAll(/'([^']*)'/g)].map((x) => x[1])) {
              try { await client.query(`ALTER TYPE ${m[1]} ADD VALUE IF NOT EXISTS '${v.replace(/'/g, "''")}'`); }
              catch (e2) { const m2 = e2 instanceof Error ? e2.message : String(e2); if (!/already exists/i.test(m2)) console.error("enum add fail: " + m2); }
            }
          }
          continue;
        }
        if (benign.test(msg) || /duplicate role/i.test(msg)) { console.log("pre skip:  " + short(s) + "  (already exists)"); continue; }
        console.error("PRE FAILURE: " + msg);
        await client.end();
        process.exit(1);
      }
    }

    // Ensure every enum value referenced anywhere in the schema exists (autocommit).
    const enumRefs = {};
    let cm;
    const castRe = /'([^']+)'::([A-Za-z_][\w.]*)/g;
    while ((cm = castRe.exec(sql))) { (enumRefs[cm[2]] ??= new Set()).add(cm[1]); }
    const typeDefRe = /create\s+type\s+([^\s]+)\s+as\s+enum\s*\(([\s\S]*?)\)/gi;
    while ((cm = typeDefRe.exec(sql))) {
      if (!enumRefs[cm[1]]) enumRefs[cm[1]] = new Set();
      [...cm[2].matchAll(/'([^']*)'/g)].map((x) => x[1]).forEach((v) => enumRefs[cm[1]].add(v));
    }
    for (const [typ, vals] of Object.entries(enumRefs)) {
      for (const v of vals) {
        try { await client.query(`ALTER TYPE ${typ} ADD VALUE IF NOT EXISTS '${v.replace(/'/g, "''")}'`); }
        catch (e) { const m2 = e instanceof Error ? e.message : String(e); if (!/already exists/i.test(m2)) console.error("enum ensure fail: " + typ + " " + v + " " + m2); }
      }
    }

    // Tx-phase (autocommit, tolerant): each statement persists independently so a
    // drifted DB (existing tables missing newer columns, etc.) converges without
    // rolling everything back on the first conflict.
    let applied = 0;
    const failures = [];
    for (let i = 0; i < tx.length; i++) {
      try {
        await client.query(tx[i]);
        applied++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!benign.test(msg)) failures.push(`#${i + 1}: ${short(tx[i])} :: ${msg.split("\n")[0].slice(0, 120)}`);
      }
    }
    console.log(`tx autocommit: applied=${applied}, non-benign failures=${failures.length}.`);
    failures.slice(0, 50).forEach((f) => console.error("  FAIL " + f));

    console.log(`DONE: schema applied (drift-tolerant).`);
    await client.end();
    process.exit(failures.length ? 1 : 0);
  } catch (err) {
    console.error("Fatal error:", err instanceof Error ? err.stack : err);
    try { await client.end(); } catch {}
    process.exit(1);
  }
})();
