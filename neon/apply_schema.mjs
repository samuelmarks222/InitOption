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

const NON_TX_RE = /^\s*(create\s+extension|create\s+role)\b/i; // cannot run in a transaction block
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
  console.log(`Parsed ${all.length} statements (${pre.length} non-transactional, ${tx.length} transactional).`);

  try {
    await client.connect();

    // Phase A: autocommit non-transactional DDL; tolerate "already exists".
    for (const s of pre) {
      try {
        await client.query(s);
        console.log("pre ok:    " + short(s));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/already exists/i.test(msg) || /duplicate role/i.test(msg)) {
          console.log("pre skip:  " + short(s) + "  (already exists)");
          continue;
        }
        console.error("PRE FAILURE: " + msg);
        await client.end();
        process.exit(1);
      }
    }

    // Phase B: transactional schema.
    await client.query("BEGIN");
    for (let i = 0; i < tx.length; i++) {
      try {
        await client.query(tx[i]);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`Transactional statement #${i + 1} / ${tx.length} FAILED:`);
        console.error(err instanceof Error ? err.message : err);
        console.error("---- statement (first 1500 chars) ----");
        console.error(tx[i].slice(0, 1500));
        await client.end();
        process.exit(1);
      }
    }
    await client.query("COMMIT");
    console.log(`SUCCESS: pre=${pre.length} ok, schema=${tx.length} committed (COMMIT).`);
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error("Fatal error:", err instanceof Error ? err.stack : err);
    try { await client.end(); } catch {}
    process.exit(1);
  }
})();
