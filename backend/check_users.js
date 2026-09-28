const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'FileMgt',
  user: 'postgres',
  password: 'root'
});

async function checkUsers() {
  try {
    const res = await pool.query(`SELECT * FROM public.users`);
    console.table(res.rows);
  } catch (e) {
    console.error(e.message);
  }
  await pool.end();
}

checkUsers();
