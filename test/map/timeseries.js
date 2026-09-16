/**
 * @file test your local JS code (development) against a remote server (production)
 * @since 4.1.0
 */

const { chromium } = require('playwright');
const fs           = require('fs');
const path         = require('path');
const packageJSON  = require('../../package.json');
const conf         = require('../../config');

const SERVER_URL = 'https://dev.g3wsuite.it/';
const TEST_NAME  = 'timeseries';

async function run() {
  const files = fs.readdirSync(conf.admin_overrides_folder, { recursive: true, withFileTypes: false });
  console.log('[g3w-test] config');
  console.log(`  proxy: ${conf.proxy}`);
  console.log(`  pluginsFolder: ${conf.pluginsFolder}`);
  console.log(`  admin_overrides_folder: ${conf.admin_overrides_folder}`);
  console.log(`  local override files: ${files.length}`);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page    = await context.newPage();
  const errors  = [];
  const localAssets = [];
  const remoteAssets = [];

  // check for JS erros
  page.on('pageerror', error => errors.push(`[pageerror]\n${error.stack || error.message}`));
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const location = msg.location();
    const source   = location.url ? `${location.url}:${location.lineNumber}:${location.columnNumber}` : 'unknown source';
    errors.push(`[console.error] ${source}\n${msg.text()}`);
  });

  // replace remote static files with local ones
  await page.route('**/static/client/*', async (route, request) => {
    const localPath = path.join(conf.admin_overrides_folder, request.url().split(SERVER_URL)[1]);

    if (fs.existsSync(localPath)) {
      localAssets.push(localPath);
      await route.fulfill({ path: localPath });
    } else {
      remoteAssets.push(request.url());
      await route.continue();
    }
  });

  const url = `${SERVER_URL}it/map/${TEST_NAME}/`;
  console.log(`[g3w-test] opening ${url}`);
  await page.goto(url);

  // wait for `window.g3w`
  await page.waitForFunction(() => window.g3w, 15000);
  const g3w = await page.evaluate(() => window.g3w);

  // ASSERT: g3w.version === process.env.g3w_client_rev
  if (g3w.version.split('-')[0] !== packageJSON.version.split('-')[0]) {
    errors.push(`[assert] invalid version: browser=${g3w.version}, package=${packageJSON.version}`);
  }

  // wait for all plugins loaded
  await page.waitForFunction(() => window.g3w.app.isready && 0 ===  window.g3w.state.plugins.length, { timeout: 30000 });
  const qtimeseries = await page.evaluate(() => !!window.g3w.app.getPlugin('qtimeseries'));

  // ASSERT: qtimeseries plugin is loaded
  if (!qtimeseries) {
    errors.push("[assert] g3w.app.getPlugin('qtimeseries') is UNDEFINED");
  }

  // dump errors
  if (errors.length > 0) {
    console.error(`\n[g3w-test] ${TEST_NAME} failed with ${errors.length} error(s)`);
  }
  console.log(`[g3w-test] static assets: ${localAssets.length} local, ${remoteAssets.length} remote`);
  localAssets.forEach(file => console.log(`  local  ${file}`));
  remoteAssets.forEach(url => console.log(`  remote ${url}`));
  if (errors.length > 0) {
    errors.forEach((error, index) => console.error(`\n${index + 1}) ${error}`));
    process.exit(1);
  }
  console.log(`[g3w-test] ${TEST_NAME} passed`);

  //https://playwright.dev/docs/api/class-browser#browser-new-context
  await context.close();
  await browser.close();
}

module.exports = run;