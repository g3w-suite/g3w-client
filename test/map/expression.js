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

  await page.goto(SERVER_URL + '/it/map/expression/');

  // check for JS erros
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  // wait for `window.g3w`
  await page.waitForFunction(() => window.g3w, 15000);
  const g3w = await page.evaluate(() => window.g3w);

  // ASSERT: g3w.version === process.env.g3w_client_rev
  if (g3w.version.split('-')[0] !== packageJSON.version.split('-')[0]) {
    errors.push('invalid version', g3w.version, packageJSON.version);
  }

  // wait for all plugins loaded
  await page.waitForFunction(() => window.g3w.app.isready && 0 ===  window.g3w.state.plugins.length, { timeout: 30000 });    

  // DEBUG
  const debug = await page.evaluate(() => ({
    hasG3w:      !!window.g3w,
    hasState:    !!window.g3w.state,
    pluginsLeft: window.g3w.state.plugins,
    plugins:     Object.keys(window.initConfig.plugins),
    user:        window.initConfig.user,
    isAppReady:  window.g3w.app.isready,
    editing:     window.g3w.app.getPlugin('editing') || 'UNDEFINED'
  })).catch(() => 'Could not get debug info');
  errors.push(`DEBUG: ${JSON.stringify(debug)}`);

  const editing = await page.evaluate(() => window.g3w.app.getPlugin('editing'));

  // ASSERT: editing plugin is loaded
  if (!editing) {
    errors.push("g3w.app.getPlugin('editing') is UNDEFINED");
  }

  // dump errors
  if (errors.length > 0) {
    console.error(errors);
    process.exit(1);
  }

  await browser.close();
})();