const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Before, After, AfterAll, Then } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const { collectCoverage, coveragePlugin, instrumentSource } = require('../support/function-coverage');

const root = path.resolve(__dirname, '../..');
const staticDir = path.join(root, 'src', 'static');
const read = (...parts) => fs.readFileSync(path.join(staticDir, ...parts), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
let browser;

Before({ tags: '@static-resources' }, function ({ pickle }) {
  this.vmCoverages = [];
  this.assignedFiles = pickle.tags.map(tag => tag.name)
    .filter(tag => tag.startsWith('@covers:src/static/'))
    .map(tag => tag.slice('@covers:src/static/'.length));
});

Before({ tags: '@static-resources and @static-browser' }, async function () {
  if (!browser) browser = await chromium.launch();
  this.context = await browser.newContext({ serviceWorkers: 'block' });
  await this.context.route('**/*', route => route.abort());
  this.page = await this.context.newPage();
  await this.page.setContent('<!doctype html><html><body></body></html>');
});

After({ tags: '@static-resources' }, async function () {
  for (const coverage of this.vmCoverages) {
    collectCoverage(coverage);
  }
  if (this.context) await this.context.close();
});

AfterAll(async function () {
  if (browser) await browser.close();
  browser = undefined;
});

Then('each registered locale provides its expected sign-in and confirmation labels', async function () {
  const bundle = (await esbuild.build({
    entryPoints: [path.join(staticDir, 'locales', 'index.js')],
    bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent',
    plugins: [coveragePlugin],
  })).outputFiles[0].text;
  const module = { exports: {} };
  const sandbox = { module, exports: module.exports };
  vm.runInNewContext(bundle, sandbox);
  this.vmCoverages.push(sandbox.__coverage__);
  const locales = module.exports.default;
  const expected = {
    bg: ['Потвърждаване', 'Вход'], de: ['Bestätigen', 'Anmelden'],
    en: ['Confirm', 'Sign in'], es: ['Confirmar', 'Iniciar sesión'],
    fi: ['Vahvista', 'Kirjaudu sisään'], fr: ['Confirmer', 'Se connecter '],
    it: ['Conferma', 'Accedi'], pl: ['Potwierdź', 'Zalogować się'],
    pt: ['Confirmar', 'Aceder'], ro: ['Confirmă', 'Logare'],
    se: ['Bekräfta', 'Logga in'], uk: ['Підтвердити', 'Вхід']
  };
  assert.deepEqual(Object.keys(locales).sort(), Object.keys(expected).sort());
  for (const [locale, labels] of Object.entries(expected)) {
    assert.deepEqual([locales[locale].confirm, locales[locale].sign_in], labels, locale);
    assert.ok(typeof locales[locale].search === 'string' && locales[locale].search.trim(), locale);
  }
});

Then('the {string} provider handles an offline search', async function (name) {
  const calls = [];
  let response;
  let zoomed;
  let geomRequest;
  let injectedStyle;
  const config = { baseurl: '/client/', mapcontrols: { geocoding: { providers: { [name]: { toshow: { roads: ['ref', 'name'] } } } } } };
  const state = { vendorkeys: {}, project: { getId: () => 42 } };
  const layer = { id: 'roads' };
  const feature = { id: 7 };
  const sandbox = {
    window: { initConfig: config, location: { host: 'local.test' } },
    initConfig: config,
    document: {
      currentScript: { src: `https://local.test/${name}.js` },
      head: { insertAdjacentHTML: (position, html) => { injectedStyle = [position, html]; } }
    },
    URL,
    g3w: {
      state,
      utils: {
        XHR: { get: async request => { calls.push(plain(request)); return response; } },
        getCatalogLayerById: id => { assert.equal(id, 'roads'); return layer; }
      },
      app: {
        getData: async (method, options) => { geomRequest = { method, options }; return { data: [{ features: [feature] }] }; },
        zoomToFeatures: features => { zoomed = features; }
      }
    },
    ol: { extent: { containsXY: ([minX, minY, maxX, maxY], x, y) => x >= minX && x <= maxX && y >= minY && y <= maxY } }
  };
  vm.runInNewContext(instrumentSource(path.join(staticDir, 'geocoding-providers', `${name}.js`)), sandbox, { filename: `${name}.js` });
  this.vmCoverages.push(sandbox.__coverage__);
  const provider = config.mapcontrols.geocoding.providers[name];
  assert.equal(typeof provider.fetch, 'function');
  const opts = { url: 'https://example.test/search?key=url-key', query: 'Rome', extent: [10, 40, 20, 50], lang: 'it', limit: 3, icon: 'custom' };

  if (name === 'qes') {
    response = { results: [
      { layer_id: 'roads', feature_id: 7, layer_name: 'Roads', attributes: { ref: 'R1', name: 'Main' } },
      { layer_id: 'other', feature_id: 8, layer_name: 'Other', attributes: { name: 'Park' } }
    ] };
    const result = await provider.fetch(opts);
    assert.equal(provider.label, 'local.test');
    assert.deepEqual(calls, [{ url: '/client/qes/api/search/42/?q=Rome&in_bbox=10,40,20,50' }]);
    assert.deepEqual(plain(result), { provider: 'qes', icon: 'layer-group', results: [
      { layer_id: 'roads', feature_id: 7, name: 'R1<br/>Main', type: 'Roads' },
      { layer_id: 'other', feature_id: 8, name: 'Park', type: 'Other' }
    ] });
    await provider.fetch_geom(result.results[0]);
    assert.equal(geomRequest.method, 'search:fids');
    assert.equal(geomRequest.options.inputs.layer, layer);
    assert.deepEqual(plain(geomRequest.options.inputs.fids), [7]);
    assert.equal(geomRequest.options.outputs.show, true);
    assert.equal(zoomed[0], feature);
    assert.match(injectedStyle[1], /\.qes input\[type="checkbox"\].*display: none/);
    return;
  }

  await assert.rejects(provider.fetch());
  if (name === 'nominatim') {
    response = [
      { name: 'Inside', lon: '12', lat: '45', type: 'road', display_name: 'Main, Rome', address: { road: 'Main', town: 'Rome', country: 'Italy' } },
      { name: 'Outside', lon: '30', lat: '45', address: {} }
    ];
    const result = await provider.fetch(opts);
    assert.deepEqual(calls[0], { url: opts.url, params: { q: 'Rome', format: 'json', addressdetails: 1, limit: 3, viewbox: '10,40,20,50', bounded: 1 } });
    assert.equal(result.label, 'Nominatim (OSM)');
    assert.equal(result.icon, 'custom');
    assert.equal(result.results.length, 1);
    assert.deepEqual(plain(result.results[0].address), { name: '', road: 'Main', city: 'Rome', country: 'Italy', formatted: 'Main, Rome' });
    assert.equal(result.results[0].name, 'Inside');
    assert.equal(result.results[0].lon, '12');
    assert.equal(result.results[0].nominatim.name, 'Inside');
    return;
  }

  if (name === 'google') {
    response = { status: 'OK', results: [
      { geometry: { location: { lng: 12, lat: 45 } }, address_components: [
        { types: ['route'], long_name: 'Main' }, { types: ['locality'], long_name: 'Rome' }, { types: ['country'], long_name: 'Italy' }
      ], display_name: 'Main, Rome' },
      { geometry: { location: { lng: 30, lat: 45 } }, address_components: [] }
    ] };
    const result = await provider.fetch(opts);
    assert.deepEqual(calls[0], { url: opts.url, params: { address: 'Rome', bounds: '40,10,50,20', language: 'it', key: 'url-key' } });
    assert.equal(result.label, 'Google');
    assert.equal(result.icon, 'custom');
    assert.equal(result.results.length, 1);
    assert.deepEqual(plain(result.results[0].address), { name: 'Main', city: 'Rome', postcode: '', country: 'Italy', formatted: 'Main, Rome' });
    assert.equal(result.results[0].lon, 12);
    assert.equal(result.results[0].lat, 45);
    response = { status: 'ZERO_RESULTS' };
    assert.equal((await provider.fetch(opts)).results.length, 0);
    response = { status: 'REQUEST_DENIED' };
    await assert.rejects(provider.fetch(opts));
    const count = calls.length;
    await assert.rejects(provider.fetch(opts));
    assert.equal(calls.length, count);
    return;
  }

  const address = { addressLine: 'Main', postalCode: '00100', locality: 'Rome', adminDistrict: 'Lazio', countryRegion: 'Italy', formattedAddress: 'Main, Rome' };
  const addressKey = name === 'bing_places' ? 'Address' : 'address';
  response = { statusCode: 200, resourceSets: [{ resources: [
    { name: 'Inside', entityType: 'Road', point: { coordinates: [45, 12] }, [addressKey]: address },
    { name: 'Outside', point: { coordinates: [45, 30] } }
  ] }] };
  const result = await provider.fetch(opts);
  assert.deepEqual(calls[0], { url: opts.url, params: { query: 'Rome', userMapView: '40,10,50,20', key: 'url-key' } });
  assert.equal(result.provider, name);
  assert.equal(result.label, name === 'bing_places' ? 'Bing Places' : 'Bing Streets');
  assert.equal(result.icon, 'custom');
  assert.equal(result.results.length, 1);
  assert.deepEqual(plain(result.results[0].address), { road: 'Main', postcode: '00100', city: 'Rome', state: 'Lazio', country: 'Italy', formatted: 'Main, Rome' });
  assert.equal(result.results[0].name, 'Inside');
  assert.equal(result.results[0].lon, 12);
  assert.equal(result.results[0].lat, 45);
  assert.equal(result.results[0].bing.entityType, 'Road');
  response = { statusCode: 401 };
  assert.equal((await provider.fetch(opts)).results.length, 0);
  state.vendorkeys.bing = 'vendor-key';
  await provider.fetch(opts);
  assert.equal(calls.at(-1).params.key, undefined);
});

Then('all assigned {word}s decode and paint visible pixels', async function (type) {
  const extension = `.${type.toLowerCase()}`;
  const files = this.assignedFiles.filter(file => file.endsWith(extension));
  assert.ok(files.length > 0);
  for (const file of files) {
    const data = fs.readFileSync(path.join(staticDir, file)).toString('base64');
    const result = await this.page.evaluate(async ({ data, type }) => {
      const image = new Image();
      image.src = `data:image/${type === 'SVG' ? 'svg+xml' : 'png'};base64,${data}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, 128, 128);
      const pixels = ctx.getImageData(0, 0, 128, 128).data;
      return { width: image.naturalWidth, height: image.naturalHeight, painted: pixels.some((value, i) => i % 4 === 3 && value > 0) };
    }, { data, type });
    assert.ok(result.width > 0 && result.height > 0 && result.painted, `${file}: ${JSON.stringify(result)}`);
  }
});

Then('each assigned font loads and changes the rendered text metrics', async function () {
  const files = this.assignedFiles.filter(file => file.endsWith('.woff2'));
  assert.equal(files.length, 8);
  for (const file of files) {
    const data = fs.readFileSync(path.join(staticDir, file)).toString('base64');
    const text = file.includes('-ext-') ? 'ĄąĘęŁłŃńŚśŹźŻż' : 'The quick brown fox 123';
    const metrics = await this.page.evaluate(async ({ data, text }) => {
      const face = new FontFace('TestFont', `url(data:font/woff2;base64,${data})`);
      await face.load();
      document.fonts.add(face);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.font = '32px monospace';
      const fallback = ctx.measureText(text).width;
      ctx.font = '32px TestFont, monospace';
      const actual = ctx.measureText(text).width;
      document.fonts.delete(face);
      return { status: face.status, fallback, actual };
    }, { data, text });
    assert.equal(metrics.status, 'loaded', file);
    assert.ok(Math.abs(metrics.actual - metrics.fallback) > 1, `${file}: ${JSON.stringify(metrics)}`);
  }
});

Then('the actual application stylesheet styles a sample interface', async function () {
  const css = read('app.css');
  await this.page.setContent(`<style>${css}</style><div class="content-wrapper"><button id="disabled" class="g3w-disabled">Disabled</button><span id="hidden" class="g3w-hide">Hidden</span></div><div class="skin-blue"><a id="link">Link</a><input id="check" type="checkbox"></div>`);
  const styles = await this.page.evaluate(() => {
    const style = id => getComputedStyle(document.getElementById(id));
    return {
      bodyMargin: getComputedStyle(document.body).margin,
      wrapperPosition: getComputedStyle(document.querySelector('.content-wrapper')).position,
      wrapperPointer: getComputedStyle(document.querySelector('.content-wrapper')).pointerEvents,
      disabledPointer: style('disabled').pointerEvents,
      disabledOpacity: style('disabled').opacity,
      hidden: style('hidden').display,
      link: style('link').color,
      accent: style('check').accentColor
    };
  });
  assert.deepEqual(styles, {
    bodyMargin: '0px', wrapperPosition: 'fixed', wrapperPointer: 'none',
    disabledPointer: 'none', disabledOpacity: '0.7', hidden: 'none',
    link: 'rgb(64, 145, 191)', accent: 'rgb(61, 145, 194)'
  });
});

Then('the static resource documentation identifies its upstream folder and available build commands', function () {
  const documentation = read('README.md');
  const link = documentation.match(/\[([^\]]+)\]\((https:\/\/[^)]+)\)/);
  assert.ok(link, 'missing upstream link');
  assert.equal(link[1], '`g3w-admin/client/static/client`');
  assert.equal(link[2], 'https://github.com/g3w-suite/g3w-admin/tree/dev/g3w-admin/client/static/client');
  const scripts = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts;
  for (const command of ['build', 'dev']) {
    assert.ok(documentation.includes(`npm run ${command}`), `missing ${command} instructions`);
    assert.ok(scripts[command], `missing npm ${command} script`);
  }
  assert.match(documentation, /update\/test your local changes/i);
});
