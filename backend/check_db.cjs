const { Pool } = require("pg");
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "FileMgt",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "root",
});
(async () => {
  try {
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema=\x27public\x27");
    console.log("Tables in DB:", tables.rows.map(r => r.table_name));
    const mods = await pool.query("SELECT * FROM public.custom_modules").catch(e => ({ rows: [], error: e.message }));
    console.log("Custom Modules:", mods.rows);
    await pool.end();
  } catch (err) {
    console.error("DB Error:", err.message);
    await pool.end();
  }
})();
