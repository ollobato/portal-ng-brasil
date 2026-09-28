const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
  
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.news-card'));
    if(cards.length > 0) cards[0].click();
  });

  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({path: 'article_modal.png'});
  await browser.close();
})();
