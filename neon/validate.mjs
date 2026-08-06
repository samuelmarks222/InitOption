import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
const client = new Client({ connectionString: DATABASE_URL });

await client.connect();

const tests = [
  ['tables count', "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"],
  ['users count', 'SELECT count(*) FROM public.users'],
  ['roles', "SELECT rolname FROM pg_roles WHERE rolname IN ('authenticated','anon','service_role')"],
  ['sample guides', 'SELECT id FROM guides LIMIT 3'],
  ['sample tournaments', 'SELECT id FROM tournaments LIMIT 3'],
];

for (const [name, query] of tests) {
  const res = await client.query(query);
  console.log(`${name}:`, JSON.stringify(res.rows));
}

await client.end();
console.log('Validation complete.');
