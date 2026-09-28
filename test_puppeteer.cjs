const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('error', error => console.log('PAGE CRASH:', error.message));

  console.log("Navigating...");
  await page.goto('http://localhost:3000/painel', { waitUntil: 'domcontentloaded' });
  
  console.log("Waiting a bit...");
  await new Promise(r => setTimeout(r, 3000));

  console.log("Waiting for Nova Matéria button...");
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Nova Matéria'));
    if(btn) btn.click();
    else console.log("Button not found!");
  });
  
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({path: 'screenshot.png'});
  console.log("Done");
  await browser.close();
})();
