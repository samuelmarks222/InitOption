import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

test('Fieldbook migration creates private tables with relationships and constraints', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE TABLE public.users(id uuid PRIMARY KEY);');
    await db.exec(await readFile(new URL('./017_fieldbook_foundation.sql', import.meta.url), 'utf8'));
    const tables = await db.query("SELECT count(*)::int AS count FROM pg_tables WHERE schemaname='fieldbook'");
    assert.equal(tables.rows[0].count,25);
    const access = await db.query("SELECT has_schema_privilege('anon', 'fieldbook', 'USAGE') AS allowed");
    assert.equal(access.rows[0].allowed,false);
    const rls = await db.query("SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='fieldbook' AND c.relkind='r' AND c.relrowsecurity");
    assert.equal(rls.rows[0].count,25);
    await assert.rejects(db.exec("INSERT INTO fieldbook.wallets (user_id,currency) VALUES ('00000000-0000-0000-0000-000000000001','USD')"));
    await assert.rejects(db.exec("INSERT INTO fieldbook.jackpots (name,currency,entry_fee_minor,closes_at) VALUES ('Test','USD',-1,now())"));
  } finally { await db.close(); }
});
