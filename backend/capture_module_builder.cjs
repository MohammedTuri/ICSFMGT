const puppeteer = require('puppeteer-core');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outPath = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\90669b10-f569-479b-9d42-3a42e492e69d\\new_module_attachment_builder.png';

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });

    // Inject session
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      localStorage.setItem('ics_auth_user', JSON.stringify({
        id: 1, username: 'admin', email: 'admin@ics.gov', role: 'ADMIN',
        fullName: 'System Administrator (IT Head)',
        branch: 'Head Office (Addis Ababa)',
        allowedBranches: ['ALL'],
        allowedDivisions: ['visa','eoid-normal','eoid-underage','residence-id','residence-id-cancellation','etd','eritrean-id','alien-passport','reports','audit-log','recycle-bin'],
        permissions: { add: true, edit: true, delete: true },
        sessionExpiry: Date.now() + (60 * 60 * 1000)
      }));
    });

    await page.goto('http://localhost:5173/system-configuration', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));

    // Find and click the first green "Create New Module" button
    await page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll('button'));
      const target = allBtns.find(b => b.textContent.toLowerCase().includes('new module') || b.textContent.toLowerCase().includes('create'));
      if (target) target.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    // Scroll down to see the form
    await page.evaluate(() => window.scrollTo(0, 200));
    await new Promise(r => setTimeout(r, 400));

    await page.screenshot({ path: outPath, fullPage: true });
    console.log('Done: ' + outPath);
  } catch(e) {
    console.error(e);
  } finally {
    await browser.close();
  }
}
capture();
