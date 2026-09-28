const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'FileMgt',
  password: 'password',
  port: 5432
});

async function fixSchema() {
  try {
    console.log('Adding updatedAt column to branches table...');
    await pool.query('ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS "updatedAt" timestamp with time zone default now();');
    console.log('✅ updatedAt column added successfully');
    
    // Verify the column exists
    const result = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'updatedAt';");
    if (result.rows.length > 0) {
      console.log('✅ Column verified in database');
    }
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

fixSchema();
