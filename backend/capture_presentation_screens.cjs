const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\90669b10-f569-479b-9d42-3a42e492e69d\\slides_assets';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function captureAll() {
  console.log('Launching browser to capture presentation slides...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1000']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });

    // 1. LOGIN PAGE
    console.log('1. Capturing Login Page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(outputDir, '01_login_page.png') });

    // Login as Admin
    await page.evaluate(() => {
      localStorage.setItem('ics_auth_user', JSON.stringify({
        id: 1,
        username: 'admin',
        email: 'admin@ics.gov',
        role: 'ADMIN',
        fullName: 'System Administrator (IT Head)',
        branch: 'Head Office (Addis Ababa)',
        allowedBranches: ['ALL'],
        allowedDivisions: ['visa', 'eoid-normal', 'eoid-underage', 'residence-id', 'residence-id-cancellation', 'etd', 'eritrean-id', 'alien-passport', 'reports', 'audit-log', 'recycle-bin'],
        permissions: { add: true, edit: true, delete: true },
        sessionExpiry: Date.now() + (60 * 60 * 1000)
      }));
      localStorage.setItem('ics_selected_branch', 'ALL');
    });

    // 2. DASHBOARD
    console.log('2. Capturing Dashboard...');
    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(outputDir, '02_dashboard_overview.png') });

    // 3. VISA FILES
    console.log('3. Capturing Visa Files...');
    await page.goto('http://localhost:5173/visa', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(outputDir, '03_visa_dossiers.png') });

    // 4. RECORD FORM MODAL (Add New File / Warehouse mapping)
    console.log('4. Capturing New Record Form...');
    const addBtn = await page.$('button.btn-primary');
    if (addBtn) {
      await addBtn.click();
      await new Promise(r => setTimeout(r, 1000));
      await page.screenshot({ path: path.join(outputDir, '04_record_form_modal.png') });
      // close modal
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 500));
    }

    // 5. BULK INGESTION MODAL
    console.log('5. Capturing Bulk Ingestion...');
    const bulkBtn = await page.$('button.btn-secondary');
    if (bulkBtn) {
      await bulkBtn.click();
      await new Promise(r => setTimeout(r, 1000));
      await page.screenshot({ path: path.join(outputDir, '05_bulk_ingestion_modal.png') });
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 500));
    }

    // 6. ETHIOPIAN ORIGIN ID
    console.log('6. Capturing Ethiopian Origin ID...');
    await page.goto('http://localhost:5173/eoid-normal', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(outputDir, '06_eoid_files.png') });

    // 7. RESIDENCE ID & CANCELLATION
    console.log('7. Capturing Residence ID...');
    await page.goto('http://localhost:5173/residence-id', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(outputDir, '07_residence_files.png') });

    // 8. COMMAND PALETTE
    console.log('8. Capturing Command Palette...');
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyK');
    await page.keyboard.up('Control');
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(outputDir, '08_command_palette.png') });
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));

    // 9. REPORTS & ANALYTICS
    console.log('9. Capturing Reports & Analytics...');
    await page.goto('http://localhost:5173/reports', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(outputDir, '09_reports_analytics.png') });

    // 10. AUDIT LOG
    console.log('10. Capturing Audit Trail Log...');
    await page.goto('http://localhost:5173/audit-log', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(outputDir, '10_audit_log.png') });

    // 11. RECYCLE BIN
    console.log('11. Capturing Recycle Bin...');
    await page.goto('http://localhost:5173/recycle-bin', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(outputDir, '11_recycle_bin.png') });

    // 12. USER MANAGEMENT
    console.log('12. Capturing User Accounts...');
    await page.goto('http://localhost:5173/user-management', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(outputDir, '12_user_management.png') });

    // 13. SYSTEM CONFIGURATION (Branches & Modules)
    console.log('13. Capturing System Configuration...');
    await page.goto('http://localhost:5173/system-configuration', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(outputDir, '13_system_configuration.png') });

    console.log('🎉 All 13 page screenshots successfully captured!');
  } catch (err) {
    console.error('Error capturing screenshots:', err);
  } finally {
    await browser.close();
  }
}

captureAll();
