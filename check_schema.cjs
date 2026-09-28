const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'FileMgt',
  password: 'root',
  port: 5432
});

pool.query(
  "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'branches' ORDER BY ordinal_position;"
).then(result => {
  console.log('\nBranches table columns:');
  result.rows.forEach(row => {
    console.log(`  - ${row.column_name} (${row.data_type})`);
  });
  pool.end();
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  pool.end();
  process.exit(1);
});
