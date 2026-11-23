const assert = require('node:assert/strict');
const path = require('node:path');
const { After, Before, Then } = require('@cucumber/cucumber');
const { instrumentSource } = require('../support/function-coverage');

Before({ tags: '@geocoding-workflows' }, async function ({ pickle }) {
  const lazy = pickle.tags.some(tag => tag.name === '@lazy-geocoding');
  const rejected = pickle.tags.some(tag => tag.name === '@provider-rejection');
  this.geoRequests = [];
  this.geoGeometryRequests = [];
  this.geoGeometryFailure = false;
  this.geoExpectedWarnings = 0;
  await this.corePage.route('**/geocoding-providers/*.js', route => {
    const provider = new URL(route.request().url()).pathname.split('/').at(-1);
    return route.fulfill({
      contentType: 'text/javascript',
      body: provider === 'areas.js' ? `
        Object.assign(initConfig.mapcontrols.geocoding.providers.areas, {
          fetch: async options => ({
            provider: 'areas',
            results: await g3w.utils.XHR.get({ url: options.url, params: {
              q: options.query, extent: options.extent.join(','), limit: options.limit, lang: options.lang
            } })
          }),
          fetch_geom: item => g3w.utils.XHR.get({ url: '/geocoding/geometry/' + item.areas_id })
        });
      ` : instrumentSource(path.resolve('src', 'static', 'geocoding-providers', provider)),
    });
  });
  await this.corePage.route('**/pushpin.svg', route => route.fulfill({
    contentType: 'image/svg+xml', path: path.resolve('src', 'static', 'images', 'pushpin.svg'),
  }));
  await this.corePage.route('**/geocoding/search/*?*', route => {
    const url = new URL(route.request().url());
    const provider = url.pathname.split('/').at(-1);
    this.geoRequests.push({ provider, params: Object.fromEntries(url.searchParams) });
    if (provider === 'areas') {
      return rejected ? route.abort('connectionreset') : route.fulfill({ json: [
        { name: 'Roma district', type: 'District', areas: { id: 5 } },
        { name: 'Roma missing geometry', areas: { id: 6 } },
      ] });
    }
    return route.fulfill({ json: [
      { place_id: 1001, name: 'Roma Central', lon: '12', lat: '45' },
      { place_id: 1002, name: 'Roma North', lon: '13', lat: '46' },
      { place_id: 1003, name: 'Roma outside the project', lon: '120', lat: '80' },
    ].filter(place => place.name.toLowerCase().includes(url.searchParams.get('q').toLowerCase())).map(place => ({
      ...place, type: 'city', display_name: place.name,
      address: { road: 'Main Road', city: 'Roma', postcode: '00100', country: 'Italy' },
    })) });
  });
  await this.corePage.route('**/geocoding/geometry/*', route => {
    const id = Number(new URL(route.request().url()).pathname.split('/').at(-1));
    this.geoGeometryRequests.push(id);
    return this.geoGeometryFailure ? route.abort('connectionreset') : route.fulfill({
      json: id === 5 ? { type: 'Polygon', coordinates: [[[12, 45], [12.1, 45], [12.1, 45.1], [12, 45]]] } : null,
    });
  });
  await this.corePage.evaluate(lazy => {
    initConfig.mapcontrols.geocoding = { providers: {
      nominatim: { url: '/geocoding/search/nominatim', label: 'Local addresses', icon: 'point' },
      ...(lazy ? { areas: { url: '/geocoding/search/areas', label: 'Local districts', icon: 'building' } } : {}),
    } };
    Object.assign(g3w.state.project.state, {
      initextent: ol.proj.transformExtent([-10, 30, 30, 60], 'EPSG:4326', 'EPSG:3857'),
      crs: { epsg: 'EPSG:3857' },
    });
    g3w.state.project.getRelations = () => [];
    g3w.state.project.getPrint = () => [];
    measureMap.getView().setCenter(ol.proj.fromLonLat([12, 45]));
    measureMap.getView().setZoom(5);
    g3w.app.getEpsg = () => measureMap.getView().getProjection().getCode();
    window.geoEffects = { zooms: [], closed: 0 };
    window.geoWarnings = [];
    console.warn = (...args) => geoWarnings.push(args.map(String).join(' '));
    g3w.app.zoomToFeatures = features => geoEffects.zooms.push(features.map(feature => feature.getId()));
    g3w.app.highlight = () => {};
    g3w.app.setContent = async options => {
      g3w.state.content.contentsdata.splice(0, g3w.state.content.contentsdata.length, options);
    };
    g3w.app.closeContent = async () => {
      geoEffects.closed++;
      g3w.state.content.contentsdata.splice(0);
    };
    document.body.insertAdjacentHTML('beforeend', '<ul id="g3w-search"><li><i class="fa fa-search"></i>Roma saved search<button class="search-tools">Run</button></li></ul>');
    window.geoSavedRuns = 0;
    document.querySelector('#g3w-search button').onclick = () => { geoSavedRuns++; };
  }, lazy);
  await this.corePage.addScriptTag({ content: instrumentSource(path.resolve('src', 'static', 'map-controls', 'geocoding.js')) });
  await this.corePage.evaluate(async () => {
    await coreTestExports.waitFor(() => Object.values(initConfig.mapcontrols.geocoding.providers).every(provider => typeof provider.fetch === 'function'), 2000);
    g3w.app.setupControl.geocoding();
    window.geocoding = measureControls.geocoding;
    measureMap.renderSync();
  });
});

After({ tags: '@geocoding-workflows' }, async function () {
  const warnings = await this.corePage.evaluate(() => geoWarnings);
  assert.equal(warnings.length, this.geoExpectedWarnings, warnings.join('\n'));
});

async function search(world, query) {
  await world.corePage.locator('.ol-geocoder input[type="search"]').fill(query);
  await world.corePage.locator('.ol-geocoder button[value="search"]').click();
  await world.corePage.waitForFunction(() => geocoding.element.querySelector('ul').matches(':popover-open')
    && !geocoding.element.querySelector('button[type="reset"]').classList.contains('gcd-spin'));
}

Then('geocoding coordinates {string} use {string} coordinates and reset cleanly', async function (query, projection) {
  await this.corePage.locator('.ol-geocoder input[type="search"]').fill(query);
  await this.corePage.locator('.ol-geocoder button[value="search"]').click();
  const result = await this.corePage.evaluate(async projection => {
    await coreTestExports.waitFor(() => geocoding.LAYER.getSource().getFeatureById('g3w-coords'), 2000);
    const feature = geocoding.LAYER.getSource().getFeatureById('g3w-coords');
    measureMap.renderSync();
    const marker = {
      coordinates: feature.getGeometry().getCoordinates(),
      expected: projection === 'geographic' ? ol.proj.fromLonLat([12, 45]) : [100, 200],
      zooms: geoEffects.zooms, resetVisible: !geocoding.element.querySelector('button[type="reset"]').hidden,
    };
    geocoding.element.querySelector('button[type="reset"]').click();
    await Vue.nextTick();
    return {
      marker, count: geocoding.LAYER.getSource().getFeatures().length,
      value: geocoding.element.querySelector('input[type="search"]').value,
      resetHidden: geocoding.element.querySelector('button[type="reset"]').hidden,
      results: geocoding.RESULTS.length,
    };
  }, projection);
  result.marker.coordinates.forEach((value, index) => assert.ok(Math.abs(value - result.marker.expected[index]) < 1e-8));
  assert.deepEqual(result.marker.zooms, [['g3w-coords']]);
  assert.equal(result.marker.resetVisible, true);
  assert.equal(result.count, 0);
  assert.equal(result.value, '');
  assert.equal(result.resetHidden, true);
  assert.equal(result.results, 0);
  assert.deepEqual(this.geoRequests, []);
});

Then('geocoding selections visibility and query-result removal stay synchronized', async function () {
  await search(this, 'Roma');
  const result = await this.corePage.evaluate(async () => {
    const items = geocoding.RESULTS.filter(item => item.__uid);
    const list = geocoding.element.querySelector('ul');
    const click = item => list.querySelector(`li[data-uid="${item.__uid}"] .gcd-name`).click();
    click(items[0]);
    await coreTestExports.waitFor(() => g3w.state.queried_layers[0]?.features.length === 1 && !g3w.state.content.loading, 2000);
    click(items[1]);
    await coreTestExports.waitFor(() => g3w.state.queried_layers[0]?.features[0]?.id === items[1].__uid && !g3w.state.content.loading, 2000);
    await Vue.nextTick();
    const selected = {
      names: items.map(item => item.name), checked: items.map(item => item.__selected),
      count: geocoding.element.querySelector('button[value="toggle-sidebar"] code').textContent,
      opacity: geocoding.element.querySelector('button[value="toggle-sidebar"] code').style.opacity,
    };
    geocoding.element.querySelector('button[value="toggle-layer"]').click();
    const hidden = { visible: geocoding.LAYER.getVisible(), icon: geocoding.element.querySelector('button[value="toggle-layer"]').classList.contains('fa-eye') };
    geocoding.LAYER.setZIndex(2);
    g3w.app.emit('set-layer-zindex', { layer: new ol.layer.Vector({ id: 'external' }), zindex: 5 });
    geocoding.element.querySelector('button[value="toggle-sidebar"]').click();
    await Vue.nextTick();
    const closed = !g3w.app.getCurrentContent();
    geocoding.element.querySelector('button[value="toggle-sidebar"]').click();
    await coreTestExports.waitFor(() => g3w.state.queried_layers[0]?.features.length === 2 && !g3w.state.content.loading, 2000);
    click(items[0]);
    await coreTestExports.waitFor(() => g3w.state.queried_layers[0]?.features.length === 1 && !g3w.state.content.loading, 2000);
    const layer = g3w.state.queried_layers[0];
    g3w.app.removeFeatureFromResult(layer, layer.features[0]);
    await coreTestExports.waitFor(() => !geocoding.LAYER.getSource().getFeatures().length, 2000);
    return {
      selected, hidden, closed, zindex: geocoding.LAYER.getZIndex(),
      remaining: geocoding.LAYER.getSource().getFeatures().length,
      checked: items.map(item => item.__selected), visible: geocoding.LAYER.getVisible(),
    };
  });
  assert.deepEqual(result, {
    selected: { names: ['Roma Central', 'Roma North'], checked: [true, true], count: '2', opacity: '0.5' },
    hidden: { visible: false, icon: true }, closed: true, zindex: 6, remaining: 0, checked: [false, false], visible: true,
  });
  assert.equal(this.geoRequests.length, 1);
  assert.equal(this.geoRequests[0].params.q, 'Roma');
  assert.equal(this.geoRequests[0].params.limit, '5');
  assert.equal(this.geoRequests[0].params.bounded, '1');
  this.geoRequests[0].params.viewbox.split(',').map(Number).forEach((value, index) => assert.ok(Math.abs(value - [-10, 30, 30, 60][index]) < 1e-8));
});

Then('geocoding lazy geometry recovers from a failed request and skips missing geometry', async function () {
  await search(this, 'Roma');
  assert.deepEqual(this.geoGeometryRequests, []);
  const expectedExtent = await this.corePage.evaluate(() => ol.proj.transformExtent(g3w.app.getMapExtent(), 'EPSG:3857', 'EPSG:4326'));
  for (const request of this.geoRequests) {
    (request.params.viewbox || request.params.extent).split(',').map(Number).forEach((value, index) => assert.ok(Math.abs(value - expectedExtent[index]) < 1e-8));
  }
  this.geoGeometryFailure = true;
  this.geoExpectedWarnings = 1;
  await this.corePage.locator('.ol-geocoder li.areas .gcd-name').filter({ hasText: 'Roma district' }).click();
  await this.corePage.waitForFunction(() => geoWarnings.length === 1);
  assert.equal(await this.corePage.evaluate(() => geocoding.LAYER.getSource().getFeatures().length), 0);
  this.geoGeometryFailure = false;
  await this.corePage.locator('.ol-geocoder li.areas .gcd-name').filter({ hasText: 'Roma district' }).click();
  const polygon = await this.corePage.evaluate(async () => {
    await coreTestExports.waitFor(() => !g3w.state.content.loading && geocoding.LAYER.getSource().getFeatures().length, 2000);
    const feature = geocoding.LAYER.getSource().getFeatures()[0];
    measureMap.renderSync();
    return {
      type: feature.getGeometry().getType(), coordinate: feature.getGeometry().getCoordinates()[0][0],
      expected: ol.proj.fromLonLat([12, 45]), stroke: geocoding.LAYER.getStyleFunction()(feature).getStroke().getColor(),
      warnings: geoWarnings,
    };
  });
  assert.equal(polygon.type, 'Polygon');
  assert.deepEqual(polygon.coordinate, polygon.expected);
  assert.equal(polygon.stroke, 'orange');
  assert.match(polygon.warnings[0], /Failed to fetch/);
  const missingResponse = this.corePage.waitForResponse('**/geocoding/geometry/6');
  await this.corePage.locator('.ol-geocoder li.areas .gcd-name').filter({ hasText: 'Roma missing geometry' }).click();
  await (await missingResponse).finished();
  await this.corePage.evaluate(() => new Promise(requestAnimationFrame));
  assert.equal(await this.corePage.evaluate(() => geocoding.RESULTS.find(item => item.name === 'Roma missing geometry').__selected), false);
  assert.equal(await this.corePage.evaluate(() => geocoding.LAYER.getSource().getFeatures().length), 1);
  assert.deepEqual(this.geoGeometryRequests, [5, 5, 6]);
});

Then('geocoding empty results release loading state despite a rejected provider', async function () {
  await search(this, 'Nowhere');
  const result = await this.corePage.evaluate(() => ({
    empty: geocoding.element.querySelector('.gcd-noresult').textContent.trim(),
    headers: [...geocoding.element.querySelectorAll('li.skin-background-color')].map(item => item.textContent.trim()),
    features: geocoding.LAYER.getSource().getFeatures().length,
  }));
  assert.deepEqual(result, { empty: 'No results', headers: ['Local addresses'], features: 0 });
  assert.deepEqual(this.geoRequests.map(request => request.provider).sort(), ['areas', 'nominatim']);
  await search(this, 'Roma');
  assert.equal(await this.corePage.evaluate(() => geocoding.RESULTS.filter(item => item.__uid).length), 2);
});

Then('a saved search selected from geocoding runs its action and resets the search', async function () {
  await search(this, 'Roma');
  await this.corePage.locator('.ol-geocoder ul li').filter({ hasText: 'Roma saved search' }).click();
  const result = await this.corePage.evaluate(() => ({
    runs: geoSavedRuns, value: geocoding.element.querySelector('input[type="search"]').value,
    results: geocoding.RESULTS.length, open: geocoding.element.querySelector('ul').matches(':popover-open'),
    focused: document.activeElement === geocoding.element.querySelector('input[type="search"]'),
  }));
  assert.deepEqual(result, { runs: 1, value: '', results: 0, open: false, focused: false });
});

Then('the geocoding popover can be dragged and dismissed without selecting a place', async function () {
  await search(this, 'Roma');
  const dragged = await this.corePage.evaluate(() => {
    const list = geocoding.element.querySelector('ul');
    const header = list.querySelector('li.skin-background-color');
    const rect = list.getBoundingClientRect();
    const x = rect.left + 20, y = rect.top + 10;
    header.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));
    const cursor = list.style.cursor;
    header.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, bubbles: true }));
    document.body.dispatchEvent(new MouseEvent('mousemove', { clientX: x + 25, clientY: y + 15, bubbles: true }));
    document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    return { cursor, left: parseFloat(list.style.left) - rect.left, top: parseFloat(list.style.top) - rect.top };
  });
  assert.equal(dragged.cursor, 'move');
  assert.ok(Math.abs(dragged.left - 25) < 0.001);
  assert.ok(Math.abs(dragged.top - 15) < 0.001);
  await this.corePage.keyboard.press('Escape');
  await this.corePage.waitForFunction(() => !geocoding.element.querySelector('ul').matches(':popover-open') && !geocoding.element.querySelector('ul').style.left);
  await search(this, 'Roma');
  await this.corePage.evaluate(() => $(document).trigger('shown.bs.modal'));
  assert.equal(await this.corePage.evaluate(() => geocoding.element.querySelector('ul').matches(':popover-open')), false);
  await this.corePage.evaluate(() => { g3w.app.emit('i18n-ready'); });
  assert.equal(await this.corePage.locator('.ol-geocoder ul li').count(), 0);
});

Then('moving the map leaves geocoding requests unchanged while automatic updates are disabled', async function () {
  await search(this, 'Roma');
  const count = this.geoRequests.length;
  await this.corePage.evaluate(() => {
    measureMap.getView().setCenter(ol.proj.fromLonLat([13, 46]));
    measureMap.renderSync();
  });
  await this.corePage.waitForTimeout(750);
  assert.equal(this.geoRequests.length, count);
  assert.equal(await this.corePage.evaluate(() => geocoding.element.querySelector('input[name="update_on_move"]').checked), false);
});
