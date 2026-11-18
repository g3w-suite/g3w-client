const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { After, Before, Given, Then, When, setDefaultTimeout } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const packageJSON = require('../../package.json');
const conf = require('../../config');

const SERVER_URL = 'http://localhost:3000/';

setDefaultTimeout(60_000);

Before({ tags: '@smoke' }, async function () {
  this.errors = [];
  this.localAssets = [];
  this.remoteAssets = [];
  this.browser = await chromium.launch();
  this.context = await this.browser.newContext();
  this.page = await this.context.newPage();

  this.page.on('pageerror', error => {
    this.errors.push(`[pageerror]\n${error.stack || error.message}`);
  });
  this.page.on('console', message => {
    if (message.type() !== 'error') {
      return;
    }
    const location = message.location();
    const source = location.url ? `${location.url}:${location.lineNumber}:${location.columnNumber}` : 'unknown source';
    this.errors.push(`[console.error] ${source}\n${message.text()}`);
  });
});

After({ tags: '@smoke' }, async function () {
  console.log(`[g3w-test] static assets: ${this.localAssets.length} local, ${this.remoteAssets.length} remote`);
  this.localAssets.forEach(file => console.log(`  local  ${file}`));
  this.remoteAssets.forEach(url => console.log(`  remote ${url}`));
  if (this.context) {
    await this.context.close();
  }
  if (this.browser) {
    await this.browser.close();
  }
});

Given('local client assets are intercepted', function () {
  this.page.route('**/static/client/*', async (route, request) => {
    const assetPath = new URL(request.url()).pathname.slice(1);
    const localPath = path.join(conf.admin_overrides_folder, assetPath);
    if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
      this.localAssets.push(localPath);
      await route.fulfill({ path: localPath });
    } else {
      this.remoteAssets.push(request.url());
      await route.continue();
    }
  });
});

When('I open project {string}', async function (project) {
  const url = new URL(`it${project}/`, SERVER_URL).toString();
  console.log(`[g3w-test] opening ${url}`);
  await this.page.goto(url);
  await this.page.waitForFunction(() => window.g3w, undefined, { timeout: 15_000 });
});

Then('the local client version is used', async function () {
  const g3w = await this.page.evaluate(() => window.g3w);
  assert.equal(
    g3w.version.split('-')[0],
    packageJSON.version.split('-')[0],
    `Unexpected client version: browser=${g3w.version}, package=${packageJSON.version}`
  );
});

Then('plugin {string} is loaded', async function (plugin) {
  await this.page.waitForFunction(
    pluginName => window.g3w.app.isready && !!window.g3w.app.getPlugin(pluginName),
    plugin,
    { timeout: 30_000 }
  );
});

Then('at least one client asset is served locally', function () {
  assert.ok(this.localAssets.length > 0, 'No client assets were loaded from the local overrides directory');
});

Then('no browser errors are reported', function () {
  assert.deepEqual(this.errors, [], this.errors.join('\n\n'));
});
