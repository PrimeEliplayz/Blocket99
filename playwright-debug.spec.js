const { test } = require('playwright/test');

test('debug market page', async ({ page }) => {
  page.on('pageerror', (err) => console.log('PAGEERROR', err.message));
  page.on('console', (msg) => console.log('CONSOLE', msg.type(), msg.text()));
  await page.goto('http://127.0.0.1:8000/market.html?cachebust=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  console.log('URL', page.url());
  console.log('BODY', await page.locator('body').innerText());
});
