const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'FileMgt',
  user: 'postgres',
  password: 'root'
});

(async () => {
  const tables = ['residence_id','eritrean_id','visa','etd','alien_passport','eoid','eoid_normal','eoid_underage'];
  for (const t of tables) {
    const res = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = $1",
      [t]
    );
    console.log(t + ': ' + res.rows.map(r => r.column_name).join(', '));
  }
  pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
