/**
 * @file test your local JS code (development) against a remote server (production)
 * @since 4.1.0
 */

const { chromium } = require('playwright');
const path         = require('path');
const fs           = require('fs');
const packageJSON  = require('../../package.json');
const conf         = require('../../config');

const SERVER_URL = 'https://dev.g3wsuite.it/';

console.log(conf);

console.log(
  fs.readdirSync(conf.admin_overrides_folder, { recursive: true, withFileTypes: false })
  .map(file => path.join(conf.admin_overrides_folder, file))
);

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page    = await context.newPage();

  // replace remote static files with local ones
  await page.route('**/static/client/*', async (route, request) => {
    const localPath = path.join(conf.admin_overrides_folder, request.url().split(SERVER_URL)[1]);
    console.log(fs.existsSync(localPath), localPath);
    if (fs.existsSync(localPath)) {
      await route.fulfill({ path: localPath });
    } else {
      await route.continue();
    }
  });

  await page.goto(SERVER_URL + '/it/map/timeseries/');

  // check for JS erros
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  // wait for `window.g3w`
  await page.waitForFunction(() => window.g3w, 15000);

  // 1. Get ONLY the version, not the entire object!
  const version = await page.evaluate(() => window.g3w?.version);
  if (!version || version.split('-')[0] !== packageJSON.version.split('-')[0]) {
    errors.push(`Version mismatch: Remote ${version} vs Local ${packageJSON.version}`);
  }

  // 2. Wait for the app to be ready and plugins to be loaded
  // Using a locator or a function that returns only a boolean (safe approach)
  await page.waitForFunction(() => {
    return window.g3w?.app?.isready && window.g3w?.state?.plugins?.length === 0;
  }, { timeout: 30000 }).catch(() => errors.push("Timeout waiting for g3w ready state"));

  /// 3. Check for the plugin WITHOUT downloading the plugin object
  const isPluginLoaded = await page.evaluate(() => {
    try {
      return !!window.g3w.app.getPlugin('qtimeseries');  // Returns only true/false, not the actual object!
    } catch (e) {
      return false;
    }
  });

  if (!isPluginLoaded) {
    errors.push("Plugin 'qtimeseries' is UNDEFINED or not loaded correctly");
  }

  // dump errors
  if (errors.length > 0) {
    console.error(errors);
    process.exit(1);
  }

  await browser.close();
})();