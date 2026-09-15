import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});
const client = await pool.connect();
try {
  const r = await client.query(`SELECT u.email, u.id, u.is_admin, u.role, p.is_admin, p.role FROM public.users u LEFT JOIN public.profiles p ON u.id = p.id WHERE u.email = 'samuelmarks222@gmail.com'`);
  console.table(r.rows);
} finally { await client.end(); await pool.end(); }