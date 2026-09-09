import pg from 'pg';
const c = new pg.Client({connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}});
await c.connect();
const r = await c.query(`SELECT proname FROM pg_proc WHERE proname LIKE '%withdrawal_verification%' OR proname LIKE '%email_change%' OR proname LIKE '%withdrawal_code%'`);
console.log(r.rows);
await c.end();