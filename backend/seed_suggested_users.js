const path = require('path');
const fs = require('fs');
const envPath = fs.existsSync(path.join(__dirname, '.env'))
  ? path.join(__dirname, '.env')
  : path.join(__dirname, '..', '.env');
require('dotenv').config({ path: envPath });
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'FileMgt',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
});

const suggestedUsers = [
  {
    username: 'admin',
    email: 'admin@ics.gov',
    password: 'admin123',
    role: 'ADMIN',
    fullName: 'System Administrator (IT Head)',
    branch: 'Head Office (Addis Ababa)',
    allowedBranches: ['ALL'],
    allowedDivisions: ['visa', 'eoid-normal', 'eoid-underage', 'residence-id', 'residence-id-cancellation', 'etd', 'eritrean-id', 'alien-passport', 'reports', 'audit-log', 'recycle-bin'],
    modulePermissions: {
      'visa': 'FULL_ACCESS',
      'eoid-normal': 'FULL_ACCESS',
      'eoid-underage': 'FULL_ACCESS',
      'residence-id': 'FULL_ACCESS',
      'residence-id-cancellation': 'FULL_ACCESS',
      'etd': 'FULL_ACCESS',
      'eritrean-id': 'FULL_ACCESS',
      'alien-passport': 'FULL_ACCESS',
      'reports': 'FULL_ACCESS',
      'audit-log': 'FULL_ACCESS',
      'recycle-bin': 'FULL_ACCESS'
    },
    permissions: { add: true, edit: true, delete: true },
    isActive: true,
    locked: false,
    status: 'active'
  },
  {
    username: 'supervisor.bole',
    email: 'supervisor.bole@ics.gov',
    password: 'Password123!',
    role: 'SUPERVISOR',
    fullName: 'Abebe Bekele (Bole Station Supervisor)',
    branch: 'Bole International Airport Branch',
    allowedBranches: ['Bole International Airport Branch'],
    allowedDivisions: ['visa', 'eoid-normal', 'eoid-underage', 'residence-id', 'residence-id-cancellation', 'etd', 'eritrean-id', 'alien-passport', 'reports'],
    modulePermissions: {
      'visa': 'FULL_ACCESS',
      'eoid-normal': 'FULL_ACCESS',
      'eoid-underage': 'FULL_ACCESS',
      'residence-id': 'FULL_ACCESS',
      'residence-id-cancellation': 'FULL_ACCESS',
      'etd': 'FULL_ACCESS',
      'eritrean-id': 'FULL_ACCESS',
      'alien-passport': 'FULL_ACCESS',
      'reports': 'VIEW_ONLY',
      'audit-log': 'NO_ACCESS',
      'recycle-bin': 'NO_ACCESS'
    },
    permissions: { add: true, edit: true, delete: true },
    isActive: true,
    locked: false,
    status: 'active'
  },
  {
    username: 'officer.visa',
    email: 'officer.visa@ics.gov',
    password: 'Password123!',
    role: 'OFFICER',
    fullName: 'Tigist Haile (Visa Archival Clerk)',
    branch: 'Head Office (Addis Ababa)',
    allowedBranches: ['Head Office (Addis Ababa)'],
    allowedDivisions: ['visa', 'etd'],
    modulePermissions: {
      'visa': 'READ_WRITE',
      'etd': 'READ_WRITE',
      'reports': 'VIEW_ONLY',
      'audit-log': 'NO_ACCESS',
      'recycle-bin': 'NO_ACCESS'
    },
    permissions: { add: true, edit: true, delete: false },
    isActive: true,
    locked: false,
    status: 'active'
  },
  {
    username: 'officer.bole',
    email: 'officer.bole@ics.gov',
    password: 'Password123!',
    role: 'OFFICER',
    fullName: 'Dawit Tadesse (Bole Intake Officer)',
    branch: 'Bole International Airport Branch',
    allowedBranches: ['Bole International Airport Branch'],
    allowedDivisions: ['visa', 'alien-passport', 'etd'],
    modulePermissions: {
      'visa': 'READ_WRITE',
      'alien-passport': 'READ_WRITE',
      'etd': 'READ_WRITE',
      'reports': 'VIEW_ONLY',
      'audit-log': 'NO_ACCESS',
      'recycle-bin': 'NO_ACCESS'
    },
    permissions: { add: true, edit: true, delete: false },
    isActive: true,
    locked: false,
    status: 'active'
  },
  {
    username: 'auditor.compliance',
    email: 'auditor@ics.gov',
    password: 'Password123!',
    role: 'AUDITOR',
    fullName: 'Yohannes Kebede (Internal Affairs & Compliance)',
    branch: 'Head Office (Addis Ababa)',
    allowedBranches: ['Head Office (Addis Ababa)'],
    allowedDivisions: ['visa', 'eoid-normal', 'eoid-underage', 'residence-id', 'residence-id-cancellation', 'etd', 'eritrean-id', 'alien-passport', 'reports', 'audit-log'],
    modulePermissions: {
      'visa': 'VIEW_ONLY',
      'eoid-normal': 'VIEW_ONLY',
      'eoid-underage': 'VIEW_ONLY',
      'residence-id': 'VIEW_ONLY',
      'residence-id-cancellation': 'VIEW_ONLY',
      'etd': 'VIEW_ONLY',
      'eritrean-id': 'VIEW_ONLY',
      'alien-passport': 'VIEW_ONLY',
      'reports': 'VIEW_ONLY',
      'audit-log': 'FULL_ACCESS',
      'recycle-bin': 'NO_ACCESS'
    },
    permissions: { add: false, edit: false, delete: false },
    isActive: true,
    locked: false,
    status: 'active'
  },
  {
    username: 'viewer.inquiry',
    email: 'inquiry@ics.gov',
    password: 'Password123!',
    role: 'VIEWER',
    fullName: 'Selamawit Girma (Front-Desk Inquiry Officer)',
    branch: 'Addis Ababa Main Branch',
    allowedBranches: ['Addis Ababa Main Branch'],
    allowedDivisions: ['visa', 'eoid-normal', 'residence-id'],
    modulePermissions: {
      'visa': 'VIEW_ONLY',
      'eoid-normal': 'VIEW_ONLY',
      'residence-id': 'VIEW_ONLY',
      'reports': 'VIEW_ONLY',
      'audit-log': 'NO_ACCESS',
      'recycle-bin': 'NO_ACCESS'
    },
    permissions: { add: false, edit: false, delete: false },
    isActive: true,
    locked: false,
    status: 'active'
  }
];

async function seedUsers() {
  console.log('Connecting to PostgreSQL database...');
  try {
    for (const u of suggestedUsers) {
      const existing = await pool.query(
        'SELECT id FROM public.users WHERE username = $1 OR email = $2',
        [u.username, u.email]
      );

      if (existing.rows.length > 0) {
        await pool.query(`
          UPDATE public.users SET
            email = $1,
            password = $2,
            role = $3,
            "fullName" = $4,
            branch = $5,
            "allowedBranches" = $6,
            "allowedDivisions" = $7,
            "modulePermissions" = $8,
            permissions = $9,
            "isActive" = $10,
            locked = $11,
            status = $12,
            "updatedAt" = NOW()
          WHERE id = $13
        `, [
          u.email,
          u.password,
          u.role,
          u.fullName,
          u.branch,
          JSON.stringify(u.allowedBranches),
          u.allowedDivisions, // passed directly as text[] array
          JSON.stringify(u.modulePermissions),
          JSON.stringify(u.permissions),
          u.isActive,
          u.locked,
          u.status,
          existing.rows[0].id
        ]);
        console.log(`✅ Updated user: ${u.username} (${u.role} - ${u.fullName})`);
      } else {
        await pool.query(`
          INSERT INTO public.users (
            username, email, password, role, "fullName", branch,
            "allowedBranches", "allowedDivisions", "modulePermissions",
            permissions, "isActive", locked, status, "loginAttempts",
            "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0, NOW(), NOW()
          )
        `, [
          u.username,
          u.email,
          u.password,
          u.role,
          u.fullName,
          u.branch,
          JSON.stringify(u.allowedBranches),
          u.allowedDivisions, // passed directly as text[] array
          JSON.stringify(u.modulePermissions),
          JSON.stringify(u.permissions),
          u.isActive,
          u.locked,
          u.status
        ]);
        console.log(`✅ Inserted new user: ${u.username} (${u.role} - ${u.fullName})`);
      }
    }
    console.log('\n🎉 All suggested users successfully seeded into PostgreSQL!');
  } catch (err) {
    console.error('❌ Failed to seed users:', err);
  } finally {
    await pool.end();
  }
}

seedUsers();
