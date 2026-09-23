/**
 * @file test your local JS code (development) against a remote server (production)
 * @since 4.1.0
 */

const { chromium } = require('playwright');
const fs           = require('fs');
const path         = require('path');
const packageJSON  = require('../package.json');
const conf         = require('../config');

const SERVER_URL = 'https://v311.g3wsuite.it/';

// run tests in sequential order
[
  { page: '/map/demo-311' },
  { page: '/map/expression', plugin: 'editing' },
  { page: '/map/statistic',  plugin: 'qplotly' },
  { page: '/map/timeseries', plugin: 'qtimeseries' },
]
.map(({ page, plugin }) => async function runTest() {
  const files = fs.readdirSync(conf.admin_overrides_folder, { recursive: true, withFileTypes: false });
  console.log('[g3w-test] config');
  console.log(`  proxy: ${conf.proxy}`);
  console.log(`  pluginsFolder: ${conf.pluginsFolder}`);
  console.log(`  admin_overrides_folder: ${conf.admin_overrides_folder}`);
  console.log(`  local override files: ${files.length}`);

  const session = {
    browser: await chromium.launch(),
    errors: [],
    localAssets: [],
    remoteAssets: [],
  };
  session.context = await session.browser.newContext();
  session.page    = await session.context.newPage();

  // check for JS erros
  session.page.on('pageerror', error => session.errors.push(`[${page}] [pageerror]\n${error.stack || error.message}`));
  session.page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const location = msg.location();
    const source   = location.url ? `${location.url}:${location.lineNumber}:${location.columnNumber}` : 'unknown source';
    session.errors.push(`[${page}] [console.error] ${source}\n${msg.text()}`);
  });

  // replace remote static files with local ones
  await session.page.route('**/static/client/*', async (route, request) => {
    const localPath = path.join(conf.admin_overrides_folder, request.url().split(SERVER_URL)[1]);
    if (fs.existsSync(localPath)) {
      session.localAssets.push(localPath);
      await route.fulfill({ path: localPath });
    } else {
      session.remoteAssets.push(request.url());
      await route.continue();
    }
  });

  const url = `${SERVER_URL}it${page}/`;
  console.log(`[g3w-test] opening ${url}`);
  await session.page.goto(url);

  // wait for `window.g3w`
  await session.page.waitForFunction(() => window.g3w, 15000);
  const g3w = await session.page.evaluate(() => window.g3w);

  // ASSERT: g3w.version === process.env.g3w_client_rev
  if (g3w.version.split('-')[0] !== packageJSON.version.split('-')[0]) {
    session.errors.push(`[${page}] [assert] invalid version: browser=${g3w.version}, package=${packageJSON.version}`);
  }

  // wait for all plugins loaded
  if (plugin) {
    await session.page.waitForFunction(() => window.g3w.app.isready && 0 === window.g3w.state.plugins.length, { timeout: 30000 });
    const loaded = await session.page.evaluate(pluginName => !!window.g3w.app.getPlugin(pluginName), plugin);
    // ASSERT: plugin is loaded
    if (!loaded) {
      session.errors.push(`[${page}] [assert] g3w.app.getPlugin('${plugin}') is UNDEFINED`);
    }
  }

  // dump errors
  if (session.errors.length > 0) {
    console.error(`\n[g3w-test] ${page} failed with ${session.errors.length} error(s)`);
  }
  console.log(`[g3w-test] static assets: ${session.localAssets.length} local, ${session.remoteAssets.length} remote`);
  session.localAssets.forEach(file => console.log(`  local  ${file}`));
  session.remoteAssets.forEach(url => console.log(`  remote ${url}`));
  if (session.errors.length > 0) {
    session.errors.forEach((error, index) => console.error(`\n${index + 1}) ${error}`));
    process.exit(1);
  }

  console.log(`[g3w-test] ${page} passed`);

  await session.context.close();
  await session.browser.close();
})
.reduce((promise, test) => promise.then(test), Promise.resolve());