// Apply once to the configured Neon database, after the existing InitOption schema.
import 'dotenv/config';
import pg from 'pg';
import { readFile } from 'node:fs/promises';

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) throw new Error('DATABASE_URL is required (server-side only).');
const client = new pg.Client({ connectionString });
await client.connect();
try {
  await client.query("SELECT pg_advisory_lock(hashtext('fieldbook-schema-migrations'))");
  const exists = await client.query("SELECT to_regclass('fieldbook.schema_migrations') AS name");
  if (exists.rows[0].name) {
    const version = await client.query('SELECT 1 FROM fieldbook.schema_migrations WHERE version = $1', ['017_fieldbook_foundation']);
    if (version.rowCount) { console.log('Fieldbook foundation already applied.'); process.exitCode = 0; }
    else throw new Error('Fieldbook migration table exists without the foundation version; inspect the database before proceeding.');
  } else {
    await client.query(await readFile(new URL('./017_fieldbook_foundation.sql', import.meta.url), 'utf8'));
    console.log('Fieldbook foundation applied.');
  }
} finally {
  await client.end(); // releases the advisory lock
}
