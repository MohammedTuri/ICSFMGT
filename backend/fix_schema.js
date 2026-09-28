const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'FileMgt',
  user: 'postgres',
  password: 'root'
});

async function fixSchema() {
  const tables = ['visa', 'eoid', 'eoid_normal', 'eoid_underage', 'residence_id', 'etd', 'eritrean_id', 'alien_passport'];
  for (const t of tables) {
    try {
      await pool.query(`ALTER TABLE public."${t}" ADD COLUMN IF NOT EXISTS "personalId" text;`);
      console.log(`✅  Added "personalId" column to public."${t}"`);
    } catch (err) {
      console.error(`❌  Error on table ${t}:`, err.message);
    }
  }

  // Also insert the 3 visa records into public.visa if not present!
  const visaData = [
    {
      personalId: 'VISA-001',
      fullName: 'SAMUEL BEKELE',
      passportNumber: 'EP1001001',
      boxNumber: 'BOX-001',
      shelfNumber: '—',
      cabinetNumber: '—',
      sex: 'M',
      citizenship: 'ETHIOPIAN',
      date: '2026-05-10',
      serviceProvided: 'VISA EXTENSION',
      requestNumber: 'REQ-1001'
    },
    {
      personalId: '123',
      fullName: 'JOHN SDDE DOE',
      passportNumber: 'QW123',
      boxNumber: 'VS-B1-01',
      shelfNumber: '00191',
      cabinetNumber: 'C1',
      sex: 'M',
      citizenship: 'ETHIOPIAN',
      date: '2026-06-01',
      serviceProvided: 'VISA ISSUANCE',
      requestNumber: 'REQ-1002'
    },
    {
      personalId: '123',
      fullName: 'JOSY YOHANNES',
      passportNumber: 'SA1234',
      boxNumber: 'VS-B1-02',
      shelfNumber: 'SH1203',
      cabinetNumber: 'C1',
      sex: 'M',
      citizenship: 'ETHIOPIAN',
      date: '2026-06-15',
      serviceProvided: 'VISA ISSUANCE',
      requestNumber: 'REQ-1003'
    }
  ];

  for (const v of visaData) {
    try {
      const check = await pool.query(
        'SELECT id FROM public.visa WHERE "passportNumber" = $1 OR ("fullName" = $2 AND "personalId" = $3)',
        [v.passportNumber, v.fullName, v.personalId]
      );
      if (check.rows.length === 0) {
        await pool.query(
          `INSERT INTO public.visa ("personalId", "fullName", "passportNumber", "boxNumber", "shelfNumber", "cabinetNumber", sex, citizenship, date, "serviceProvided", "requestNumber", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
          [v.personalId, v.fullName, v.passportNumber, v.boxNumber, v.shelfNumber, v.cabinetNumber, v.sex, v.citizenship, v.date, v.serviceProvided, v.requestNumber]
        );
        console.log(`✅  Inserted record: ${v.fullName} (${v.passportNumber}) into public.visa`);
      } else {
        console.log(`ℹ️  Record already exists: ${v.fullName}`);
      }
    } catch (err) {
      console.error(`❌  Failed to insert record ${v.fullName}:`, err.message);
    }
  }

  const allVisa = await pool.query('SELECT id, "personalId", "fullName", "passportNumber", "boxNumber", "shelfNumber" FROM public.visa ORDER BY id ASC');
  console.log('\n📊  CURRENT ROWS IN public.visa (PostgreSQL):');
  console.table(allVisa.rows);

  await pool.end();
}

fixSchema();
