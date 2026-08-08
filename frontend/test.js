const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  console.log('Navigating to https://tattoo-hub.xyz/ru...');
  await page.goto('https://tattoo-hub.xyz/ru', { waitUntil: 'networkidle0' });
  
  const html = await page.evaluate(() => document.documentElement.outerHTML);
  console.log('Root node:', html.substring(0, 150));
  
  await browser.close();
})();
