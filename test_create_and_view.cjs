const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('error', error => console.log('PAGE CRASH:', error.message));

  console.log("Navigating to home...");
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("Clicking first article...");
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.news-card'));
    if(cards.length > 0) cards[0].click();
    else console.log("No news cards found!");
  });

  await new Promise(r => setTimeout(r, 2000));
  
  const text = await page.evaluate(() => document.body.innerText);
  console.log("Body text starts with:", text.substring(0, 100));
  
  await browser.close();
})();
