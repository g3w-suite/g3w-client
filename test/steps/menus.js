const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('@vue/compiler-sfc');
const { After, Before, Then } = require('@cucumber/cucumber');

Before({ tags: '@context-menu-workflows' }, async function () {
  this.corePage.setDefaultTimeout(5000);
  this.menuWarnings = [];
  this.corePage.on('console', message => {
    if (['warning', 'error'].includes(message.type())) this.menuWarnings.push(message.text());
  });
  await this.corePage.route('**/node_modules/**', route => {
    const root = path.resolve('node_modules');
    const relative = decodeURIComponent(new URL(route.request().url()).pathname.split('/node_modules/')[1]);
    const filename = path.resolve(root, ...relative.split('/'));
    assert.ok(filename.startsWith(root + path.sep), 'stylesheets must load only local dependencies');
    return route.fulfill({ path: filename });
  });
  await this.corePage.route('**/static/client/app.css', route => route.fulfill({
    path: path.resolve('src', 'static', 'app.css'), contentType: 'text/css',
  }));
  await this.corePage.route('**/static/client/fonts/*', route => route.fulfill({
    path: path.resolve('src', 'static', 'fonts', path.basename(new URL(route.request().url()).pathname)),
  }));
  await this.corePage.addStyleTag({ url: 'http://core.test/static/client/app.css' });
  const component = parse({
    source: fs.readFileSync(path.resolve('src', 'components', 'ContextMenu.vue'), 'utf8'),
  });
  await this.corePage.addStyleTag({ content: component.styles.map(style => style.content).join('\n') });
  this.menuRequests = [];
  await this.corePage.route('**/vector/**', route => {
    const request = route.request();
    const url = new URL(request.url());
    this.menuRequests.push({ path: url.pathname, params: Object.fromEntries(url.searchParams), body: request.postData() });
    return route.fulfill({ json: { result: true, data: { filtertoken: url.searchParams.get('mode') === 'apply' ? 'selected-filter' : null } } });
  });
  await this.corePage.evaluate(async () => {
    Object.assign(initConfig.mapcontrols, { screenshot: true, streetview: true, annotation: true });
    Object.assign(g3w.state.project.state, {
      name: 'Local project', extent: [-1000, -1000, 1000, 1000],
      feature_count: 7, querymultilayers: [], urls: { edit: '/admin/project/', layers: '/admin/layers/' },
    });
    g3w.state.project.getName = () => 'Local project';
    g3w.state.project.getQueryPointTolerance = () => ({ unit: 'pixel', value: 8 });
    g3w.app.isReady = async () => true;
    g3w.app.isMapReady = async () => true;
    g3w.app.getEpsg = () => 'EPSG:3857';
    window.menuActiveControl = null;
    g3w.app.getCurrentToggledMapControl = () => menuActiveControl;
    window.menuEffects = { tools: [], queries: [], data: [], legend: 0, embeds: [] };
    for (const name of ['screenshot', 'annotation', 'streetview']) {
      measureControls[name] = {
        toggle: value => menuEffects.tools.push([name, value]),
        showStreetView: coordinates => menuEffects.tools.push([name, coordinates]),
      };
    }
    g3w.app.showLegendPanel = () => { menuEffects.legend++; };
    g3w.app.getPermalink = async (url, options) => { menuEffects.embeds.push([url.href, options]); };
    g3w.app['getData/query:coordinates'] = async inputs => {
      menuEffects.queries.push(inputs);
      return { result: true, data: [] };
    };
    g3w.app.showData = async data => { menuEffects.data.push(data); };
    document.body.insertAdjacentHTML('beforeend',
      '<button id="catalog-context" style="position:fixed;left:30px;bottom:16px">Catalog context</button>');
    window.menuNode = null;
    document.querySelector('#catalog-context').addEventListener('click', event => {
      g3w.app.emit('context-menu', { x: 30, y: 30, target: event.target }, menuNode);
    });
    window.menuView = await mountFormComponent(coreTestExports.ContextMenu);
    window.menuVector = new ol.layer.Vector({ source: new ol.source.Vector(), style: new ol.style.Style() });
    menuVector.getStyle()._g3w_options = {};
    window.menuImage = new ol.layer.Tile();
    g3w.app.getLayerById = id => id === 'image' ? menuImage : menuVector;
    g3w.app.getLayerByName = () => menuVector;
    measureMap.addLayer(menuVector);
    measureMap.addLayer(menuImage);
    g3w.app.layersCount = measureMap.getLayers().getLength();
    window.menuCatalogLayer = createFixtureLayer({
      id: 'roads', name: 'roads', title: 'Road network', geometrytype: 'LineString', capabilities: 7,
      crs: { epsg: 'EPSG:3857' }, bbox: { minx: 10, miny: 20, maxx: 100, maxy: 120 },
      styles: [{ name: 'default', current: true }, { name: 'night', current: false }],
      metadata: { abstract: 'Road network metadata', attributes: [], keywords: [] },
      download_csv: true,
    });
    window.openCatalogMenu = async node => {
      menuNode = node;
      document.querySelector('#catalog-context').click();
      await coreTestExports.waitFor(() => menuView.context && menuView.$refs.menu, 1000);
      await Vue.nextTick();
    };
    window.openMapMenu = async () => {
      measureMap.dispatchEvent({
        type: 'contextmenu', pixel: [180, 130], preventDefault() {},
        originalEvent: { x: 60, y: 40 },
      });
      await coreTestExports.waitFor(() => menuView.context === 'map', 1000);
      await Vue.nextTick();
    };
    measureMap.renderSync();
  });
});

After({ tags: '@context-menu-workflows' }, async function () {
  await this.corePage.evaluate(() => { menuView.$destroy(); });
  assert.deepEqual(this.menuWarnings, [], 'context menus must not hide browser warnings or failed source operations');
});

async function clickMenu(page, icon) {
  await page.locator(`.context-menu > li:has(> i.${icon})`).click();
  await page.waitForFunction(() => !menuView.context);
}

Then('the map context menu copies and queries its location and navigates the real view', async function () {
  await this.corePage.evaluate(async () => {
    window.menuCopiedText = null;
    document.addEventListener('copy', event => {
      const input = document.activeElement;
      menuCopiedText = input.value.slice(input.selectionStart, input.selectionEnd);
      event.preventDefault();
    });
    await openMapMenu();
  });
  await clickMenu(this.corePage, 'fa-map-pin');
  assert.equal(await this.corePage.evaluate(() => menuCopiedText),
    (await this.corePage.evaluate(() => menuView.map_coords)).join(', '));
  for (const [icon, delta] of [['fa-search-plus', 1], ['fa-search-minus', -1]]) {
    const zoom = await this.corePage.evaluate(async () => { await openMapMenu(); return measureMap.getView().getZoom(); });
    await clickMenu(this.corePage, icon);
    await this.corePage.waitForFunction(() => !measureMap.getView().getAnimating());
    assert.ok(Math.abs(await this.corePage.evaluate(() => measureMap.getView().getZoom()) - zoom - delta) < 0.0001);
    assert.deepEqual(await this.corePage.evaluate(() => measureMap.getView().getCenter()), await this.corePage.evaluate(() => menuView.map_coords));
  }
  await this.corePage.evaluate(async () => { await openMapMenu(); });
  await clickMenu(this.corePage, 'fa-question-circle');
  const query = await this.corePage.evaluate(() => ({ inputs: menuEffects.queries[0], data: menuEffects.data }));
  assert.deepEqual(query, {
    inputs: { coordinates: await this.corePage.evaluate(() => menuView.map_coords), feature_count: 7,
      query_point_tolerance: { unit: 'pixel', value: 8 }, multilayers: false },
    data: [{ result: true, data: [] }],
  });
  await this.corePage.evaluate(async () => { await openMapMenu(); });
  await clickMenu(this.corePage, 'fa-home');
  await this.corePage.waitForFunction(() => !measureMap.getView().getAnimating());
  const extent = await this.corePage.evaluate(() => measureMap.getView().calculateExtent(measureMap.getSize()));
  assert.ok(extent[0] <= -1000 && extent[1] <= -1000 && extent[2] >= 1000 && extent[3] >= 1000);
});

Then('context actions delegate to their map tools and close the menu', async function () {
  for (const icon of ['fa-camera-retro', 'fa-font', 'fa-street-view', 'fa-list', 'fa-share-alt']) {
    await this.corePage.evaluate(async () => { await openMapMenu(); });
    await clickMenu(this.corePage, icon);
  }
  const result = await this.corePage.evaluate(() => ({ effects: menuEffects, coordinates: menuView.map_coords, url: location.href }));
  assert.deepEqual(result.effects.tools, [['screenshot', true], ['annotation', undefined], ['streetview', result.coordinates]]);
  assert.equal(result.effects.legend, 1);
  assert.deepEqual(result.effects.embeds, [[result.url, {}]]);
});

Then('measuring and disabled map contexts do not open a menu', async function () {
  const result = await this.corePage.evaluate(async () => {
    const contexts = [];
    for (const [control, disabled, type] of [
      [{ name: 'measure' }, false, 'contextmenu'], [null, true, 'contextmenu'],
      [{ name: 'query' }, false, 'singleclick'], [null, false, 'singleclick'],
    ]) {
      menuView.closeMenu();
      menuActiveControl = control;
      measureMap.set('can_show_context_menu', !disabled);
      let prevented = false;
      measureMap.dispatchEvent({
        type, pixel: [100, 100], originalEvent: { x: 20, y: 20 },
        preventDefault() { prevented = true; },
      });
      await Vue.nextTick();
      contexts.push([menuView.context, prevented]);
    }
    return contexts;
  });
  assert.deepEqual(result, [[null, false], [null, false], [null, false], ['map', false]]);
});

Then('custom context entries can be selected dragged and dismissed', async function () {
  await this.corePage.evaluate(async () => {
    window.menuPluginCalls = [];
    g3w.app.on('project:context-menu', menu => {
      menu.items.push(
        { label: 'Plugin action', icon: 'pencil', position: -1, cbk: event => menuPluginCalls.push(event.type) },
        { label: 'Plugin children', position: 100, children: [{ label: 'Nested action', cbk: () => menuPluginCalls.push('child') }] },
      );
    });
    await openCatalogMenu({ nodes: [], root: true, geolayer: true });
  });
  await this.corePage.locator('.context-menu > li').filter({ hasText: 'Plugin action' }).click();
  const children = this.corePage.locator('.context-menu > li').filter({ hasText: 'Plugin children' });
  await children.hover();
  await children.locator('li').click();
  assert.deepEqual(await this.corePage.evaluate(() => menuPluginCalls), ['click', 'child']);
  const title = await this.corePage.locator('.context-menu > li.title').boundingBox();
  const before = await this.corePage.evaluate(() => [menuView.left, menuView.top]);
  await this.corePage.mouse.move(title.x + 20, title.y + 10);
  await this.corePage.mouse.down();
  await this.corePage.mouse.move(title.x + 55, title.y + 35, { steps: 3 });
  await this.corePage.mouse.up();
  const after = await this.corePage.evaluate(() => [menuView.left, menuView.top]);
  assert.ok(Math.abs(after[0] - before[0] - 35) < 0.01);
  assert.ok(Math.abs(after[1] - before[1] - 25) < 0.01);
  await this.corePage.keyboard.press('Escape');
  await this.corePage.waitForFunction(() => !menuView.context);
  await this.corePage.setViewportSize({ width: 600, height: 900 });
  await this.corePage.evaluate(async () => { await openCatalogMenu({ nodes: [], root: true }); });
  const rect = await this.corePage.locator('.context-menu').boundingBox();
  assert.ok(Math.abs(rect.x + rect.width / 2 - 300) < 2, JSON.stringify(rect));
  assert.ok(Math.abs(rect.y + rect.height / 2 - 450) < 2, JSON.stringify(rect));
  await this.corePage.mouse.click(590, 890);
  await this.corePage.waitForFunction(() => !menuView.context);
});

Then('catalog context actions change styles apply toggle and delete saved filters', async function () {
  await this.corePage.evaluate(async () => {
    g3w.state.map_theme.theme = 'night-theme';
    menuCatalogLayer.state.filters.push({ fid: 'main', name: 'Main roads' }, { fid: 'local', name: 'Local roads' });
    await openCatalogMenu(menuCatalogLayer.state);
  });
  const styles = this.corePage.locator('.context-menu > li:has(> i.fa-palette)');
  await styles.hover();
  await styles.locator('li').filter({ hasText: 'night' }).click();
  await this.corePage.waitForFunction(() => !menuView.context);
  assert.deepEqual(await this.corePage.evaluate(() => [menuCatalogLayer.getCurrentStyle().name, g3w.state.map_theme.theme]), ['night', null]);
  for (const expected of ['main', null]) {
    await this.corePage.evaluate(async () => { await openCatalogMenu(menuCatalogLayer.state); });
    const filters = this.corePage.locator('.context-menu > li:has(> i.fa-filter)');
    await filters.hover();
    await filters.locator('li').filter({ hasText: 'Main roads' }).click();
    await this.corePage.waitForFunction(() => !menuView.context);
    assert.equal(await this.corePage.evaluate(() => menuCatalogLayer.state.filter.current?.fid || null), expected);
  }
  await this.corePage.evaluate(async () => { await openCatalogMenu(menuCatalogLayer.state); });
  const filters = this.corePage.locator('.context-menu > li:has(> i.fa-filter)');
  await filters.hover();
  await filters.locator('li').filter({ hasText: 'Local roads' }).locator('.fa-trash').click();
  await this.corePage.waitForFunction(() => !menuView.context);
  assert.deepEqual(await this.corePage.evaluate(() => menuCatalogLayer.state.filters.map(filter => filter.fid)), ['main']);
  assert.ok(this.menuRequests.some(request => request.body && JSON.parse(request.body).style === 'night'));
  assert.deepEqual(this.menuRequests.filter(request => request.params.mode).map(request => request.params.mode), ['apply', 'delete', 'delete_saved']);
});

Then('external image context actions update their map layer and fit its extent', async function () {
  await this.corePage.evaluate(async () => {
    window.menuImageNode = Vue.observable({
      id: 'image', title: 'External WMS', _type: 'wms', opacity: 1, position: 'bottom',
      bbox: { minx: 0.001, miny: 0.001, maxx: 0.003, maxy: 0.004 }, epsg: 'EPSG:4326',
    });
    await openCatalogMenu(menuImageNode);
  });
  const opacity = this.corePage.locator('.context-menu > li:has(> i.fa-sliders-h)');
  await opacity.hover();
  await opacity.locator('input').fill('0.4');
  assert.equal(await this.corePage.evaluate(() => menuImage.getOpacity()), 0.4);
  const position = this.corePage.locator('.context-menu > li:has(> i.fa-sort)');
  await position.hover();
  await position.locator('li').first().click();
  await this.corePage.waitForFunction(() => !menuView.context);
  assert.equal(await this.corePage.evaluate(() => menuImage.get('position')), 'top');
  assert.equal(await this.corePage.evaluate(() => menuImage.getZIndex()), await this.corePage.evaluate(() => g3w.app.layersCount));
  await this.corePage.evaluate(async () => { await openCatalogMenu(menuImageNode); });
  await position.hover();
  await position.locator('li').last().click();
  await this.corePage.waitForFunction(() => !menuView.context);
  assert.deepEqual(await this.corePage.evaluate(() => [menuImage.get('position'), menuImage.getZIndex()]), ['bottom', 0]);
  await this.corePage.evaluate(async () => { await openCatalogMenu(menuImageNode); });
  await clickMenu(this.corePage, 'fa-search');
  const extent = await this.corePage.evaluate(() => measureMap.getView().calculateExtent(measureMap.getSize()));
  assert.ok(extent[0] <= 111.32 && extent[1] <= 111.32 && extent[2] >= 333.95 && extent[3] >= 445.27);
});

Then('the context color picker updates the actual vector style and preserves alpha', async function () {
  await this.corePage.evaluate(async () => {
    window.menuVectorNode = Vue.observable({
      id: 'vector', name: 'Imported tracks', title: 'Imported tracks', _type: 'vector',
      external: true, color: '#ff0000', position: 'top',
    });
    g3w.state.catalog.external.vector.push({ id: 'vector', geometryType: 'LineString' });
    await openCatalogMenu(menuVectorNode);
  });
  const colors = this.corePage.locator('.context-menu > li:has(> i.fa-tint)');
  await colors.hover();
  const plane = colors.locator('.g3w-color-picker-plane');
  const box = await plane.boundingBox();
  await this.corePage.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await this.corePage.mouse.down();
  await this.corePage.mouse.move(box.x + box.width, box.y, { steps: 4 });
  await this.corePage.mouse.up();
  await plane.focus();
  await this.corePage.keyboard.press('ArrowLeft');
  await this.corePage.keyboard.press('ArrowDown');
  assert.equal(await this.corePage.evaluate(() => menuVectorNode.color.hex), '#fa0505');
  await this.corePage.keyboard.press('ArrowUp');
  await this.corePage.keyboard.press('ArrowRight');
  await this.corePage.keyboard.press('a');
  await colors.locator('.g3w-color-picker-hue').fill('120');
  await colors.locator('.g3w-color-picker-opacity').fill('0.35');
  const result = await this.corePage.evaluate(() => ({
    color: menuVectorNode.color, applied: menuVector.getStyle()._g3w_options.color,
    text: document.querySelector('.g3w-color-picker-heading output').textContent,
    open: menuView.context, geometry: document.querySelector('.context-menu .title').textContent,
  }));
  assert.equal(result.color.hex, '#00ff00');
  assert.equal(result.color.rgba.a, 0.35);
  assert.deepEqual(result.applied, result.color);
  assert.equal(result.text, '#00ff00');
  assert.equal(result.open, 'layer');
  assert.match(result.geometry, /LineString/);
  await this.corePage.evaluate(async () => { menuVectorNode.color = 'rgba(0, 0, 255, 0.6)'; await Vue.nextTick(); });
  assert.deepEqual(await this.corePage.evaluate(() => [menuView.hue, menuView.alpha, menuView.color.hex]), [240, 0.6, '#0000ff']);
});

Then('catalog metadata opens and expands the selected layer and handles missing entries', async function () {
  await this.corePage.evaluate(() => {
    document.body.insertAdjacentHTML('beforeend', `
      <dialog id="modal-metadata">
        <a href="#metadata_general">General</a><a href="#metadata_layers">Layers</a>
        <div id="metadata_layers">
          <details open><summary>Other layer</summary><ul><li><a href="#layer_general_other">Other</a></li></ul></details>
          <details><summary>Road network</summary><ul><li><a href="#layer_general_roads">Roads</a></li></ul></details>
        </div>
      </dialog>`);
    window.menuMetadataTabs = [];
    document.querySelectorAll('#modal-metadata > a').forEach(anchor => anchor.addEventListener('click', event => {
      event.preventDefault();
      menuMetadataTabs.push(anchor.hash);
    }));
  });
  for (const node of ['roads', 'missing', 'project']) {
    await this.corePage.evaluate(async id => {
      await openCatalogMenu(id === 'project' ? { nodes: [], root: true } :
        id === 'roads' ? menuCatalogLayer.state : { id: 'missing', metadata: {}, projectLayer: true });
    }, node);
    await clickMenu(this.corePage, 'fa-info-circle');
    await this.corePage.waitForFunction(count => menuMetadataTabs.length === count, node === 'roads' ? 1 : node === 'missing' ? 2 : 3);
    if (node === 'roads') {
      await this.corePage.waitForFunction(() => document.querySelectorAll('#metadata_layers details[open]').length === 1 &&
        document.querySelector('#metadata_layers details[open] summary').textContent === 'Road network');
    }
    await this.corePage.evaluate(() => { document.querySelector('#modal-metadata').close(); });
  }
  assert.deepEqual(await this.corePage.evaluate(() => menuMetadataTabs), ['#metadata_layers', '#metadata_layers', '#metadata_general']);
});

Then('exporting an external layer opens the real download dialog and saves its response', async function () {
  const contents = JSON.stringify({
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: { name: 'Track' }, geometry: { type: 'Point', coordinates: [10, 20] } }],
  });
  await this.corePage.route('**/fixture/context-download', route => route.fulfill({
    contentType: 'application/geo+json', headers: { 'content-disposition': 'attachment; filename=tracks.geojson' },
    body: contents,
  }));
  await this.corePage.evaluate(async () => {
    await openCatalogMenu({
      id: 'tracks', name: 'Imported tracks', title: 'Imported tracks', _type: 'vector',
      color: '#ff0000', position: 'top', downloadUrl: '/fixture/context-download',
    });
  });
  await clickMenu(this.corePage, 'fa-download');
  const dialog = this.corePage.locator('dialog[open]');
  assert.equal(await dialog.locator('[name="layer"]').inputValue(), 'tracks');
  assert.equal(await dialog.locator('[name="format"]').inputValue(), 'external-url');
  const pending = this.corePage.waitForEvent('download');
  await dialog.locator('#confirm_button').click();
  const download = await pending;
  assert.equal(download.suggestedFilename(), 'tracks.geojson');
  assert.equal(fs.readFileSync(await download.path(), 'utf8'), contents);
  await this.corePage.waitForFunction(() => !g3w.state.download && !document.querySelector('dialog[open]'));
});

Then('the catalog context menu opens and mounts its layer attribute table', async function () {
  await this.corePage.evaluate(async () => {
    const show = g3w.app.showContent;
    g3w.app.showContent = options => {
      show(options);
      window.tableView = options.content.internalComponent;
      tableView.$mount();
      document.querySelector('#fixture').append(tableView.$el);
    };
    window.tableLayer = createFixtureLayer({
      id: 'roads', name: 'roads', title: 'Road network', geometrytype: 'Point', capabilities: 7,
      crs: { epsg: 'EPSG:3857' }, fields: ['name', 'kind', 'tags'].map(name => ({ name, type: 'varchar', show: true })),
    });
    await openCatalogMenu(tableLayer.state);
  });
  await clickMenu(this.corePage, 'fa-list-alt');
  await this.corePage.waitForFunction(() => window.tableView?.state.features.length === 12 && !g3w.state.content.loading);
  assert.equal(await this.corePage.locator('#open_attribute_table tbody tr').count(), 12);
  assert.equal(await this.corePage.evaluate(() => tableEffects.content[0].title), 'Road network');
});
