const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('error', error => console.log('PAGE CRASH:', error.message));

  console.log("Navigating to article route directly...");
  await page.goto('http://localhost:3000/geral/teste-materia-news-12345678', { waitUntil: 'domcontentloaded' });
  
  await new Promise(r => setTimeout(r, 2000));

  const text = await page.evaluate(() => document.body.innerText);
  console.log("Body text starts with:", text.substring(0, 100));
  
  await browser.close();
})();
