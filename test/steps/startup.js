const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('@vue/compiler-sfc');
const { strToU8, zipSync } = require('fflate');
const { After, Before, Then } = require('@cucumber/cucumber');
const { openCorePage } = require('../support/core-browser');
const { closeCoreContext, instrumentSource } = require('../support/function-coverage');

Before({ tags: '@application-bootstrap', timeout: 60_000 }, async function ({ pickle }) {
  await closeCoreContext(this.coreContext);
  this.coreContext = undefined;
  this.startupErrors = [];
  this.startupRequests = [];
  const withPlugin = pickle.tags.some(tag => tag.name === '@startup-plugin');
  const withExternalLayers = pickle.tags.some(tag => tag.name === '@external-layer-workflows');
  const withAnnotations = pickle.tags.some(tag => tag.name === '@annotation-workflows');
  const crs = { epsg: 'EPSG:3857', proj4: '', axisinverted: false, geographic: false };
  this.startupConfig = {
    id: 1, gid: 'qdjango:1', type: 'qdjango', name: 'Offline project',
    crs, extent: [-2000, -2000, 2000, 2000], initextent: [-500, -500, 500, 500],
    map_themes: { project: [], custom: [] }, context_base_legend: false,
    metadata: {}, relations: [], print: [], search: [], wms_use_layer_ids: true,
    wms_getmap_format: 'image/png', toc_layers_init_status: 'not_collapsed',
    layers: [{
      id: 'roads', name: 'roads', title: 'Road network', geometrytype: 'LineString',
      servertype: 'QGIS', source: { type: 'postgres' }, capabilities: 7, crs,
      styles: [{ name: 'default', current: true }],
      fields: [{ name: 'name', label: 'Name', type: 'varchar', show: true }],
      bbox: { minx: -100, miny: -100, maxx: 100, maxy: 100 },
      toc: true, checked: true, visible: true, exclude_from_legend: true, download_csv: true,
    }],
    layerstree: [{ name: 'Transport', expanded: true, checked: true, nodes: [{ id: 'roads', toc: true, checked: true }] }],
  };
  const { context, page } = await openCorePage(this.coreBrowser, 'index.prod.js', async page => {
    page.on('console', message => {
      if (['warning', 'error'].includes(message.type())) this.startupErrors.push(message.text());
    });
    page.on('pageerror', error => this.startupErrors.push(error.message));
    await page.route('http://core.test/static/client/**', route => {
      const root = path.resolve('src', 'static');
      const relative = decodeURIComponent(new URL(route.request().url()).pathname.slice('/static/client/'.length));
      const filename = path.resolve(root, ...relative.split('/'));
      assert.ok(filename.startsWith(root + path.sep));
      if (filename.endsWith('.js')) {
        return route.fulfill({ contentType: 'text/javascript', body: instrumentSource(filename) });
      }
      assert.ok(fs.existsSync(filename), `Missing local application asset: ${filename}`);
      return route.fulfill({ path: filename });
    });
    await page.route('http://core.test/node_modules/**', route => {
      const root = path.resolve('node_modules');
      const relative = decodeURIComponent(new URL(route.request().url()).pathname.slice('/node_modules/'.length));
      const filename = path.resolve(root, ...relative.split('/'));
      assert.ok(filename.startsWith(root + path.sep));
      return route.fulfill({ path: filename });
    });
    await page.route('https://unpkg.com/platform@1.3.6/platform.js', route => route.fulfill({
      contentType: 'text/javascript',
      body: 'window.platform = { name: "Chromium", version: "offline", os: { toString() { return "Test OS"; } } };',
    }));
    if (withPlugin) {
      await page.route('**/fixture/dependency.js', route => route.fulfill({
        contentType: 'text/javascript', body: 'window.pluginStartupOrder = ["dependency"];',
      }));
      await page.route('**/offline-plugin/js/plugin.js?*', route => route.fulfill({
        contentType: 'text/javascript',
        body: `
          window.pluginStartupOrder.push("plugin");
          const plugin = new g3w.Plugin({ name: "offline-plugin", config: { gid: "qdjango:1" } });
          plugin.registerPlugin("qdjango:1");
          plugin.setReady(true);
        `,
      }));
    }
    await page.route('**/api/config/**', route => route.fulfill({ json: this.startupConfig }));
    await page.route('**/ows/**', route => {
      this.startupRequests.push(Object.fromEntries(new URL(route.request().url()).searchParams));
      return route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><path d="M0 128H256" stroke="blue"/></svg>',
      });
    });
    await page.route('http://maps.test/**', route => route.fulfill({
      contentType: 'image/svg+xml', headers: { 'Access-Control-Allow-Origin': '*' },
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><path d="M0 128H256" stroke="green"/></svg>',
    }));
    await page.route('**/fixture/wms-config/', route => {
      this.wmsConnectionRequest = route.request().postDataJSON();
      return route.fulfill({ json: {
        result: true, title: 'Local WMS', abstract: 'Offline transport and water',
        methods: { GetMap: { urls: [{ type: 'Get', url: 'http://maps.test/wms' }] } },
        layers: [
          { name: 'roads', title: 'Roads', abstract: 'Transport', crss: [{ epsg: 3857 }, { epsg: 4326 }] },
          { name: 'rivers', title: 'Rivers', abstract: 'Water', crss: [{ epsg: 3857 }] },
        ],
      } });
    });
    await page.evaluate(({ crs, extent, initextent, withPlugin, withExternalLayers, withAnnotations }) => {
      Object.assign(initConfig, {
        id: 1, initproject: 'qdjango:1', crs, extent, initextent,
        projects: [{ id: 1, gid: 'qdjango:1', type: 'qdjango', name: 'Offline project', modified: 1, crs, extent, initextent }],
        user: { i18n: 'en', username: 'offline', is_staff: false },
        title: 'Offline maps', main_map_title: 'Local catalog', header_logo_img: 'g3wsuite_logo.png',
        mediaurl: '/static/client/images/', frontendurl: '/', version: 'v4.2.0',
        groups: [], macrogroups: [],
        plugins: withPlugin ? { 'offline-plugin': { jsscripts: ['/fixture/dependency.js'] } } : {},
        vendorkeys: {}, mapcontrols: {
          zoom: true, ...(withExternalLayers ? { addlayers: true } : {}),
          ...(withAnnotations ? { annotation: true } : {}),
        },
        layout: { legend: {}, rightpanel: { width: 50, height: 50 } },
        interfaceowsurl: '/fixture/wms-config/',
      });
      document.querySelector('#app').outerHTML = '<app id="app"></app>';
    }, { ...this.startupConfig, withPlugin, withExternalLayers, withAnnotations });
    await page.addStyleTag({ url: 'http://core.test/static/client/app.css' });
    const component = parse({
      source: fs.readFileSync(path.resolve('src', 'components', 'ModalAddLayer.vue'), 'utf8'),
    });
    await page.addStyleTag({ content: component.styles.map(style => style.content).join('\n') });
  });
  this.coreContext = context;
  this.corePage = page;
  page.setDefaultTimeout(10_000);
  await page.waitForFunction(() => g3wsdk.core.ApplicationService.complete || document.querySelector('.error-page'), null, { timeout: 15_000 });
});

After({ tags: '@application-bootstrap' }, async function () {
  const canvasAdvisory = 'Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true. See: https://html.spec.whatwg.org/multipage/canvas.html#concept-canvas-will-read-frequently';
  assert.deepEqual(this.startupErrors.filter(message => message !== canvasAdvisory), [],
    'production startup must not hide failed requests or source errors');
});

Then('the production application displays its project catalog and a ready map', async function () {
  const result = await this.corePage.evaluate(async () => {
    await g3w.app.isReady();
    await g3w.app.isMapReady();
    return {
      name: g3w.state.project.getName(), id: g3w.state.project.getGid(),
      layers: g3w.state.project.getLayers().map(layer => layer.getId()),
      catalog: document.querySelector('#g3w-menu').textContent,
      map: g3w.app.getMap() instanceof ol.Map,
      epsg: g3w.app.getEpsg(), spinner: !!document.querySelector('#startingspinner'),
    };
  });
  assert.equal(result.name, 'Offline project');
  assert.equal(result.id, 'qdjango:1');
  assert.deepEqual(result.layers, ['roads']);
  assert.match(result.catalog, /Road network/);
  assert.equal(result.map, true);
  assert.equal(result.epsg, 'EPSG:3857');
  assert.equal(result.spinner, false);
});

Then('the production registry filters real spatial and nonspatial layers', async function () {
  const result = await this.corePage.evaluate(() => {
    const project = g3w.state.project;
    const layer = (id, config) => new g3w.Layer({
      id, name: id, title: id, geometrytype: 'Point', servertype: 'QGIS',
      source: { type: 'postgres' }, capabilities: 7,
      fields: [{ name: 'name', label: 'Name', type: 'varchar', show: true }],
      styles: [{ name: 'default', current: true }],
      crs: { epsg: 'EPSG:3857' }, projection: project.getProjection(),
      checked: false, visible: false, ...config,
    }, { project });
    project.addLayers([
      layer('notes', { geometrytype: 'NoGeometry', capabilities: 0 }),
      layer('places', { hidden: true }),
    ]);
    const ids = (filter, options) => project.getLayers(filter, options).map(layer => layer.getId());
    const filters = {
      all: ids(null), ids: ids({ IDS: ['roads', 'places'] }),
      scalarId: ids({ IDS: 'notes' }), queryable: ids({ QUERYABLE: true }),
      notQueryable: ids({ QUERYABLE: false }), filterable: ids({ FILTERABLE: true }),
      editable: ids({ EDITABLE: true }), visible: ids({ VISIBLE: true }),
      spatial: ids({ GEOLAYER: true }), table: ids({ GEOLAYER: false }),
      vector: ids({ VECTORLAYER: true }), hidden: ids({ HIDDEN: true }),
      enabled: ids({ DISABLED: false }), server: ids({ SERVERTYPE: 'QGIS' }),
      otherServer: ids({ SERVERTYPE: 'WMS' }), bases: Object.keys(project.getBaseLayers()),
      printable: ids({ PRINTABLE: { scale: 1000 } }),
      toc: ids({ GEOLAYER: true }, { TOC_ORDER: true }),
      noSelection: ids({ SELECTED_OR_ALL: true }),
    };
    project.selectLayer('places', true);
    filters.selected = ids({ SELECTED: true });
    filters.notSelected = ids({ SELECTED: false });
    filters.selectedOrAll = ids({ SELECTED_OR_ALL: true });
    project.selectLayer('places', false);
    filters.cleared = ids({ SELECTED_OR_ALL: true });
    return filters;
  });
  assert.deepEqual(result, {
    all: ['roads', 'notes', 'places'], ids: ['roads', 'places'], scalarId: ['notes'],
    queryable: ['roads', 'places'], notQueryable: ['notes'], filterable: ['roads', 'places'],
    editable: ['roads', 'places'], visible: ['roads'], spatial: ['roads', 'places'],
    table: ['notes'], vector: [], hidden: ['places'],
    enabled: ['roads', 'notes', 'places'], server: ['roads', 'notes', 'places'],
    otherServer: [], bases: [], printable: ['roads'], toc: ['roads'],
    noSelection: ['roads', 'notes', 'places'], selected: ['places'],
    notSelected: ['roads', 'notes'], selectedOrAll: ['places'], cleared: ['roads', 'notes', 'places'],
  });
});

Then('the production project exposes its configuration and removes registered layers', async function () {
  const result = await this.corePage.evaluate(() => {
    const project = g3w.state.project;
    const roads = project.getLayerByName('roads');
    const metadata = {
      identity: [project.getId(), project.getType(), project.getGid(), project.getName()],
      crs: project.getCrs(), extent: project.getExtent(), initial: project.getInitExtent(),
      attributes: project.getLayerAttributes('roads').map(field => field.name),
      label: project.getLayerAttributeLabel('roads', 'name'),
      spatial: project.getGeoLayers().map(layer => layer.getId()),
      configs: project.getConfigLayers().map(layer => layer.id),
      withDownloads: project.getConfigLayers({ key: 'download_csv' }).map(layer => layer.id),
      withoutMissingProperty: project.getConfigLayers({ key: 'doesNotExist' }).length,
      sameState: project.getState() === project.state,
      print: project.getPrint(), relations: project.getRelations(),
      missingRelation: project.getRelationById('missing') === undefined,
      tree: project.getLayersTree()[0].nodes[0].name,
      tolerance: project.getQueryPointTolerance(), featurecount: project.getUrl('featurecount'),
    };
    document.querySelector('#app').__vue__.$root.$destroy();
    project.removeLayer(roads);
    metadata.afterRemove = project.getLayers().length;
    project.addLayer(roads);
    metadata.afterAdd = project.getLayers().map(layer => layer.getId());
    project.removeLayers();
    metadata.afterClear = project.getLayers().length;
    project.removeLayersTree();
    metadata.treeAfterClear = project.getLayersTree().length;
    const options = { ...project.config, wmsUrl: '/fixture/ows/' };
    project.setOptions(options);
    metadata.wms = project.getWmsUrl();
    return metadata;
  });
  assert.deepEqual(result, {
    identity: [1, 'qdjango', 'qdjango:1', 'Offline project'], crs: 'EPSG:3857',
    extent: [-2000, -2000, 2000, 2000], initial: [-500, -500, 500, 500],
    attributes: ['name'], label: 'Name', spatial: ['roads'], configs: ['roads'],
    withDownloads: ['roads'], withoutMissingProperty: 0, sameState: true,
    print: [], relations: [], missingRelation: true, tree: 'Transport',
    tolerance: { unit: 'pixel', value: 10 }, featurecount: '/vector/featurecount/qdjango/1/',
    afterRemove: 0, afterAdd: ['roads'], afterClear: 0, treeAfterClear: 0, wms: '/fixture/ows/',
  });
});

Then('native catalog actions update layer visibility selection and map bounds', async function () {
  const page = this.corePage;
  const node = title => page.locator('.tree-node-title').filter({ hasText: title }).locator('..');
  const visible = () => page.evaluate(() => g3w.state.project.getLayerById('roads').isVisible());
  const road = node('Road network');
  const group = node('Transport');
  await road.locator(':scope > input[type="checkbox"]').click();
  assert.equal(await visible(), false);
  await road.locator(':scope > input[type="checkbox"]').click();
  assert.equal(await visible(), true);
  await group.locator(':scope > input[type="checkbox"]').click();
  assert.equal(await visible(), false);
  await group.locator(':scope > input[type="checkbox"]').click();
  assert.equal(await visible(), true);
  await group.locator(':scope > .tree-toggler').click();
  assert.equal(await road.isVisible(), false);
  await group.locator(':scope > .tree-toggler').click();
  assert.equal(await road.isVisible(), true);
  await road.locator(':scope > .tree-node-title').click();
  await page.waitForFunction(() => g3w.state.project.getLayerById('roads').isSelected());
  await road.locator(':scope > .tree-node-title').dblclick();
  await page.waitForFunction(() => g3w.app.getMap().getView().getResolution() < 5);
  assert.deepEqual(await page.evaluate(() => g3w.app.getMap().getView().getCenter()), [0, 0]);
});

async function openContent(page, titles) {
  await page.evaluate(async titles => {
    for (const [index, title] of titles.entries()) {
      const content = document.createElement('section');
      content.dataset.fixtureContent = title;
      content.textContent = title;
      await g3w.app[index ? 'pushContent' : 'showContent']({
        content, title, text: true, perc: 50, split: 'h',
      });
    }
  }, titles);
}

Then('native content controls navigate back and close the production content stack', async function () {
  const page = this.corePage;
  await openContent(page, ['First', 'Second', 'Third']);
  assert.equal(await page.evaluate(() => g3w.app.getContentLength()), 3);
  await page.locator('.content_breadcrumb button').first().click();
  await page.waitForFunction(() => g3w.app.getContentLength() === 1);
  assert.equal(await page.locator('[data-fixture-content]').textContent(), 'First');
  await openContent(page, ['Replacement', 'Detail']);
  await page.locator('.action-button-back').click();
  await page.waitForFunction(() => g3w.app.getContentLength() === 1);
  assert.equal(await page.locator('[data-fixture-content]').textContent(), 'Replacement');
  await page.locator('.action-button-close').click();
  await page.waitForFunction(() => g3w.app.getContentLength() === 0 && document.querySelector('#g3w-content').hidden);
  assert.equal(await page.locator('[data-fixture-content]').count(), 0);
  assert.deepEqual(await page.evaluate(() => g3w.state.content.sizes), { width: 0, height: 0 });
});

Then('native content controls dock enlarge and drag the production panel', async function () {
  const page = this.corePage;
  await openContent(page, ['Resizable']);
  await page.locator('.action-button-resize').click();
  assert.equal(await page.evaluate(() => g3w.state.layout.app.rightpanel.width_100), true);
  await page.locator('.action-button-resize').click();
  assert.equal(await page.evaluate(() => g3w.state.layout.app.rightpanel.width_100), false);
  await page.locator('.action-button-dock').click();
  assert.equal(await page.evaluate(() => g3w.state.split), 'v');
  await page.locator('.action-button-resize').click();
  assert.equal(await page.evaluate(() => g3w.state.layout.app.rightpanel.height_100), true);
  await page.locator('.action-button-resize').click();
  const handle = page.locator('#content-resizer');
  await handle.hover();
  const box = await handle.boundingBox();
  assert.ok(box, 'visible content must expose its resize handle');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForFunction(() => g3w.state.content.disabled);
  await page.mouse.move(box.x + box.width / 2, box.y - 60, { steps: 4 });
  await page.mouse.up();
  const resized = await page.evaluate(() => ({
    height: g3w.state.layout.app.rightpanel.height,
    disabled: g3w.state.content.disabled, full: g3w.state.layout.app.rightpanel.height_100,
  }));
  assert.ok(resized.height > 50 && resized.height <= 90, JSON.stringify(resized));
  assert.equal(resized.disabled, false);
  assert.equal(resized.full, false);
  await page.locator('.action-button-dock').click();
  assert.equal(await page.evaluate(() => g3w.state.split), 'h');
  await page.locator('.sidebar-aside-toggle').click();
  assert.equal(await page.evaluate(() => g3w.app.isSidebarVisible()), false);
  await page.locator('.sidebar-aside-toggle').click();
  assert.equal(await page.evaluate(() => g3w.app.isSidebarVisible()), true);
});

Then('the production application reacts to browser offline and online events', async function () {
  const result = await this.corePage.evaluate(() => {
    window.dispatchEvent(new Event('offline'));
    const offline = g3w.state.online;
    window.dispatchEvent(new Event('online'));
    return { offline, online: g3w.state.online };
  });
  assert.deepEqual(result, { offline: false, online: true });
});

Then('the production loader initializes a local plugin after its dependency', async function () {
  const result = await this.corePage.evaluate(async () => {
    const plugin = g3w.app.getPlugin('offline-plugin');
    return {
      order: window.pluginStartupOrder,
      ready: await plugin.isReady(),
      loading: g3w.state.plugins.slice(),
      name: plugin.getName(),
    };
  });
  assert.deepEqual(result, { order: ['dependency', 'plugin'], ready: true, loading: [], name: 'offline-plugin' });
});

async function openLayerDialog(page, type) {
  await page.locator('.ol-addlayer button').click();
  await page.locator('#modal-addlayer').waitFor({ state: 'visible' });
  await page.locator('#add-layer-type').selectOption(type);
}

async function uploadLayer(page, name, data) {
  await page.locator('#addcustomlayer input[type="file"]').setInputFiles({
    name, mimeType: 'application/octet-stream',
    buffer: Buffer.isBuffer(data) ? data : Buffer.from(data),
  });
  await page.waitForFunction(() => document.querySelector('#modal-addlayer').__vue__.olLayer !== null);
}

async function submitLayer(page, name) {
  await page.locator('#modal-addlayer menu .btn-success').click();
  await page.waitForFunction(name => g3w.app.getLayerByName(name) && !document.querySelector('#modal-addlayer').open, name);
}

Then('the production add-layer dialog imports styles and removes a GeoJSON layer', async function () {
  const page = this.corePage;
  await openLayerDialog(page, 'file');
  await uploadLayer(page, 'places.geojson', JSON.stringify({
    type: 'FeatureCollection', features: [{
      type: 'Feature', properties: { name: 'Station' }, geometry: { type: 'Point', coordinates: [10, 20] },
    }],
  }));
  await page.locator('#g3w-select-field-layer').selectOption('name');
  const plane = page.locator('#modal-addlayer .g3w-color-picker-plane');
  await plane.click({ position: { x: 40, y: 30 } });
  await plane.press('ArrowRight');
  await plane.press('ArrowUp');
  await page.locator('#modal-addlayer .g3w-color-picker-hue').fill('120');
  await page.locator('#modal-addlayer .g3w-color-picker-opacity').fill('0.5');
  const color = await page.locator('#modal-addlayer .g3w-color-picker-heading output').textContent();
  await submitLayer(page, 'places.geojson');
  const result = await page.evaluate(() => {
    const layer = g3w.app.getLayerByName('places.geojson');
    const feature = layer.getSource().getFeatures()[0];
    const style = layer.getStyleFunction()(feature);
    return {
      geometry: feature.getGeometry().getCoordinates(), label: style.getText().getText(),
      color: ol.color.asArray(style.getImage().getFill().getColor()),
      catalog: document.querySelector('#g3w-menu').textContent,
    };
  });
  assert.deepEqual(result.geometry, [10, 20]);
  assert.equal(result.label, 'Station');
  assert.equal(result.color[3], 0.5);
  assert.notEqual(color, '#194d33');
  assert.match(result.catalog, /places.geojson/);
  const node = page.locator('.tree-node-title').filter({ hasText: 'places.geojson' }).locator('..');
  await node.locator(':scope > input[type="checkbox"]').click();
  assert.equal(await page.evaluate(() => g3w.app.getLayerByName('places.geojson').getVisible()), false);
  await node.locator(':scope > button[title="Remove"]').click();
  await page.waitForFunction(() => !g3w.app.getLayerByName('places.geojson'));
});

Then('the production add-layer dialog imports valid CSV rows and reports invalid coordinates', async function () {
  const page = this.corePage;
  await openLayerDialog(page, 'file');
  await uploadLayer(page, 'points.csv', 'x,y,name\n10,20,"Main, station"\nbad,30,Invalid\n40,50,Depot');
  assert.match(await page.locator('#csv_parse_errors').textContent(), /\[2\][\s\S]*bad[\s\S]*30[\s\S]*Invalid/);
  assert.match(await page.locator('#addcustomlayer').textContent(), /points.csv/);
  await submitLayer(page, 'points.csv');
  const result = await page.evaluate(() => g3w.app.getLayerByName('points.csv').getSource().getFeatures()
    .map(feature => ({ name: feature.get('name'), coordinates: feature.getGeometry().getCoordinates() })));
  assert.deepEqual(result, [
    { name: 'Main, station', coordinates: [10, 20] }, { name: 'Depot', coordinates: [40, 50] },
  ]);
});

Then('the production add-layer dialog imports a local KMZ archive', async function () {
  const page = this.corePage;
  await openLayerDialog(page, 'file');
  const kml = '<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>Station</name><styleUrl>#pin</styleUrl><Point><coordinates>1,2</coordinates></Point></Placemark></Document></kml>';
  await uploadLayer(page, 'station.kmz', Buffer.from(zipSync({ 'folder/doc.kml': strToU8(kml) })));
  await submitLayer(page, 'station.kmz');
  const result = await page.evaluate(() => {
    const feature = g3w.app.getLayerByName('station.kmz').getSource().getFeatures()[0];
    return {
      coordinates: ol.proj.toLonLat(feature.getGeometry().getCoordinates()),
      name: feature.get('name'), hasStyleUrl: feature.get('styleUrl') !== undefined,
    };
  });
  assert.ok(Math.abs(result.coordinates[0] - 1) < 1e-8);
  assert.ok(Math.abs(result.coordinates[1] - 2) < 1e-8);
  assert.equal(result.name, 'Station');
  assert.equal(result.hasStyleUrl, false);
});

Then('the production add-layer dialog selects WMS layers and remembers its connection', async function () {
  const page = this.corePage;
  await openLayerDialog(page, 'wms');
  await page.locator('#add_wms_url').fill('http://maps.test/wms');
  await page.locator('#add_wms_name').fill('Local service');
  await page.locator('#modal-addlayer').getByRole('button', { name: 'Connect', exact: true }).click();
  await page.locator('#g3w-wms-layers').fill('transport');
  assert.equal(await page.locator('#modal-addlayer tbody tr').count(), 1);
  const all = page.locator('#modal-addlayer thead input[type="checkbox"]');
  await all.check();
  await page.locator('#g3w-wms-layers').fill('');
  assert.equal(await page.locator('#modal-addlayer tbody tr').count(), 2);
  await all.check();
  assert.equal(await page.locator('#modal-addlayer tbody input:checked').count(), 2);
  await all.uncheck();
  assert.equal(await page.locator('#modal-addlayer tbody input:checked').count(), 0);
  await page.locator('#modal-addlayer tbody tr').filter({ hasText: 'Roads' }).click();
  await page.locator('#g3w-wms-layer-name').fill('External roads');
  await submitLayer(page, 'External roads');
  const result = await page.evaluate(() => ({
    layers: g3w.app.getLayerByName('External roads').getSource().getParams().LAYERS,
    saved: g3w.app.getLocalStorage('externallayers'),
  }));
  assert.deepEqual(this.wmsConnectionRequest, { url: 'http://maps.test/wms', service: 'wms' });
  assert.deepEqual(result.layers, ['roads']);
  assert.equal(result.saved.data[0].name, 'External roads');
  assert.equal(result.saved.urls[0].id, 'Local service');
  await openLayerDialog(page, 'wms');
  await page.locator('#modal-addlayer i[title="Remove"]').click();
  assert.deepEqual(await page.evaluate(() => g3w.app.getLocalStorage('externallayers').urls), []);
  await page.locator('#modal-addlayer menu button[value="cancel"]').click();
});

Then('the production add-layer dialog loads a TMS layer and persists its opacity', async function () {
  const page = this.corePage;
  await openLayerDialog(page, 'tms');
  await page.locator('#add_tms_url').fill('http://maps.test/tiles/{z}/{x}/{y}.png');
  await page.locator('#add_tms_name').fill('Local tiles');
  await page.locator('#g3w-tms-opacity').fill('0.6');
  await submitLayer(page, 'Local tiles');
  const result = await page.evaluate(() => {
    const layer = g3w.app.getLayerByName('Local tiles');
    const original = layer.getOpacity();
    layer.setOpacity(0.3);
    layer.setVisible(false);
    return {
      original, stored: g3w.app.getLocalStorage('externallayers').data.find(layer => layer.name === 'Local tiles'),
    };
  });
  assert.equal(result.original, 0.6);
  assert.equal(result.stored.opacity, 0.3);
  assert.equal(result.stored.visible, false);
  assert.equal(result.stored.type, 'tms');
});
