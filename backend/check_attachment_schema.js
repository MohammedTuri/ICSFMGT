const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'FileMgt',
  user: 'postgres',
  password: 'root'
});

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'residence_id';
    `);
    console.table(res.rows);
  } catch (e) {
    console.error(e.message);
  }
  await pool.end();
}

checkSchema();
