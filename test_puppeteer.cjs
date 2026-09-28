const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:3000/painel/login', { waitUntil: 'networkidle0' });
  
  console.log("Waiting for Nova Matéria button...");
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Nova Matéria'));
    if(btn) btn.click();
  });
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
