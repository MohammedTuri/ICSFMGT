const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'FileMgt',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root'
});

async function addMissingColumns() {
  const tables = ['visa', 'eoid', 'eoid_normal', 'eoid_underage', 'residence_id', 'residence_id_cancellation', 'etd', 'eritrean_id', 'alien_passport', 'workpermit'];
  const sharedColumns = {
    personalId: 'text', boxNumber: 'text', shelfNumber: 'text', cabinetNumber: 'text', folderNumber: 'text',
    fullName: 'text', firstName: 'text', middleName: 'text', lastName: 'text', sex: 'text', citizenship: 'text',
    passportNumber: 'text', requestNumber: 'text', date: 'text', birthdate: 'text', serviceProvided: 'text',
    branch: 'text', building: 'text', room: 'text', recordNumber: 'text', createdBy: 'text',
    createdAt: 'timestamp with time zone', updatedAt: 'timestamp with time zone', ocrText: 'text',
    attachments: "jsonb DEFAULT '[]'::jsonb"
  };
  const moduleColumns = {
    eoidNumber: 'text', eoidType: "text DEFAULT 'EOID-NORMAL'", guardianFullName: 'text', guardianPassportId: 'text',
    guardianRelationship: 'text', residenceIdNumber: 'text', residenceIdType: 'text', permanentId: 'text',
    temporaryId: 'text', companyName: 'text', etdNumber: 'text', etdType: 'text', eritreanIdNumber: 'text',
    alienPassportNumber: 'text', visaNumber: 'text', visaType: 'text', type: 'text'
  };
  const queries = tables.flatMap(table => Object.entries({ ...sharedColumns, ...moduleColumns }).map(([column, definition]) =>
    `ALTER TABLE public."${table}" ADD COLUMN IF NOT EXISTS "${column}" ${definition};`
  )).concat([
    `ALTER TABLE public.eoid ADD COLUMN IF NOT EXISTS "eoidNumber" text;`,
    
    `ALTER TABLE public.eoid_normal ADD COLUMN IF NOT EXISTS "eoidNumber" text;`,
    
    `ALTER TABLE public.eoid_underage ADD COLUMN IF NOT EXISTS "eoidNumber" text;`,
    
    `ALTER TABLE public.residence_id ADD COLUMN IF NOT EXISTS "residenceIdNumber" text;`,
    `ALTER TABLE public.residence_id ADD COLUMN IF NOT EXISTS "residenceIdType" text;`,
    `ALTER TABLE public.residence_id ADD COLUMN IF NOT EXISTS "permanentId" text;`,
    `ALTER TABLE public.residence_id ADD COLUMN IF NOT EXISTS "temporaryId" text;`,
    `ALTER TABLE public.residence_id ADD COLUMN IF NOT EXISTS "companyName" text;`,
    
    `ALTER TABLE public.etd ADD COLUMN IF NOT EXISTS "etdNumber" text;`,
    
    `ALTER TABLE public.eritrean_id ADD COLUMN IF NOT EXISTS "eritreanIdNumber" text;`,
    
    `ALTER TABLE public.alien_passport ADD COLUMN IF NOT EXISTS "alienPassportNumber" text;`,
    
    `ALTER TABLE public.visa ADD COLUMN IF NOT EXISTS "visaNumber" text;`,
    
    `ALTER TABLE public.eoid ADD COLUMN IF NOT EXISTS "guardianFullName" text;`,
    `ALTER TABLE public.eoid ADD COLUMN IF NOT EXISTS "guardianPassportId" text;`,
    `ALTER TABLE public.eoid ADD COLUMN IF NOT EXISTS "guardianRelationship" text;`,
    `ALTER TABLE public.eoid ADD COLUMN IF NOT EXISTS "birthdate" text;`,
    
    `ALTER TABLE public.eoid_underage ADD COLUMN IF NOT EXISTS "guardianFullName" text;`,
    `ALTER TABLE public.eoid_underage ADD COLUMN IF NOT EXISTS "guardianPassportId" text;`,
    `ALTER TABLE public.eoid_underage ADD COLUMN IF NOT EXISTS "guardianRelationship" text;`,
    `ALTER TABLE public.eoid_underage ADD COLUMN IF NOT EXISTS "birthdate" text;`,

    `ALTER TABLE public.eoid_normal ADD COLUMN IF NOT EXISTS "guardianFullName" text;`,
    `ALTER TABLE public.eoid_normal ADD COLUMN IF NOT EXISTS "guardianPassportId" text;`,
    `ALTER TABLE public.eoid_normal ADD COLUMN IF NOT EXISTS "guardianRelationship" text;`,
    `ALTER TABLE public.eoid_normal ADD COLUMN IF NOT EXISTS "birthdate" text;`,

    `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "loginAttempts" integer DEFAULT 0;`,
    `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "locked" boolean DEFAULT false;`,
    `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active';`,
    `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "lastLogin" text;`,
    `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "permissions" jsonb DEFAULT '{"add":true,"edit":true,"delete":true}'::jsonb;`
  ]);

  for (const q of queries) {
    try {
      await pool.query(q);
      console.log('Executed:', q);
    } catch (e) {
      console.error('Error on query:', q, e.message);
    }
  }

  await pool.end();
}

addMissingColumns();
