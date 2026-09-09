import pg from 'pg';
const c = new pg.Client({connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}});
await c.connect();
const r = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'withdrawal_requests' AND column_name LIKE '%verification%'`);
console.log('withdrawal_requests columns:', r.rows);
const r2 = await c.query(`SELECT table_name FROM information_schema.tables WHERE table_name = 'withdrawal_verification_codes'`);
console.log('withdrawal_verification_codes table:', r2.rows);
await c.end();