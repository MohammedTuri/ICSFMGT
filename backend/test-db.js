require('dotenv').config();
const { Client } = require('pg');

const config = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5433,
  database: process.env.DB_NAME     || 'FileMgt',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
};

console.log('Attempting connection with:');
console.log('  Host    :', config.host);
console.log('  Port    :', config.port);
console.log('  Database:', config.database);
console.log('  User    :', config.user);
console.log('  Password:', config.password ? '****' : '(empty)');
console.log('');

const client = new Client(config);
client.connect()
  .then(() => {
    console.log('✅ SUCCESS! Connected to PostgreSQL.');
    return client.query('SELECT current_database(), version()');
  })
  .then(res => {
    console.log('   DB Name :', res.rows[0].current_database);
    console.log('   Version :', res.rows[0].version.split(',')[0]);
    client.end();
  })
  .catch(err => {
    console.error('❌ FAILED:', err.message);
    console.error('   Code   :', err.code);
    console.error('   Detail :', err.detail || 'N/A');
    console.error('');
    console.error('Common fixes:');
    if (err.code === '28P01') {
      console.error('  → Wrong password. Check DB_PASSWORD in server/.env');
    } else if (err.code === '28000') {
      console.error('  → Authentication failed. The user might need "md5" auth in pg_hba.conf');
    } else if (err.code === '3D000') {
      console.error('  → Database does not exist. Check DB_NAME in server/.env');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('  → PostgreSQL is not running, or wrong host/port');
    }
    process.exit(1);
  });