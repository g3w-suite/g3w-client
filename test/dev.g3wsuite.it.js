const { chromium } = require('playwright');
const path         = require('path');
const fs           = require('fs');
const packageJSON  = require('../package.json');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // replace remote static files with local ones
  await page.route('**/static/client/(.*)', async (route, request) => {
    const localPath = path.join(process.cwd(), 'dist', request.url().split('/static/client/')[1]);
    if (fs.existsSync(localPath)) {
      await route.fulfill({
        path: localPath,
      });
    } else {
      await route.continue();
    }
  });

  await page.goto('https://dev.g3wsuite.it/it/map/demo-310/', { waitUntil: 'networkidle' });

  // check for JS erros
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  // wait 10 sec
  await page.waitForTimeout(10000);

  // ASSERT: process.env.g3w_client_rev === g3w.version
  const VERSION_OK = await page.evaluate(rev => globalThis.g3w.version.split('-')[0] === rev, packageJSON.version);

  if (!VERSION_OK) {
    errors.push('invalid version');
  }

  if (errors.length > 0) {
    console.error(errors);
    process.exit(1);
  }

  await browser.close();
})();
