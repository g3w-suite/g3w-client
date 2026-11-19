const assert = require('node:assert/strict');
const path = require('node:path');
const { After, Before, Then } = require('@cucumber/cucumber');
const { instrumentSource } = require('../support/function-coverage');

Before({ tags: '@map-control-workflows' }, async function ({ pickle }) {
  await this.corePage.addStyleTag({ path: require.resolve('ol/ol.css') });
  await this.corePage.evaluate(async dual => {
    g3w.gettext.register('en', (await import('/static/client/locales/en.js')).default);
    Vue.prototype.$fa = name => `icon-${name}`;
    initConfig.mapcontrols = dual ? { length: true, area: true } : { length: true };
    Object.assign(g3w.state, { map_epsg: 'EPSG:3857', map_unit: 'm' });
    document.querySelector('#fixture').style.cssText = 'width:400px;height:320px';
    window.measureMap = new ol.Map({
      target: 'fixture', layers: [], controls: [], interactions: [],
      view: new ol.View({ center: [50, 50], zoom: 18, padding: [0, 0, 40, 0] }),
    });
    measureMap.setSize([400, 320]);
    window.measureControls = {};
    g3w.app.getMap = () => measureMap;
    g3w.app.getMapControl = type => measureControls[type];
    g3w.app.addControl = (type, control) => {
      measureControls[type] = control;
      measureMap.addControl(control);
    };
  }, pickle.tags.some(tag => tag.name === '@dual-measure'));
});

Before({ tags: '@measure-workflows' }, async function () {
  await this.corePage.addScriptTag({ content: instrumentSource(path.resolve('src', 'static', 'map-controls', 'measure.js')) });
  await this.corePage.evaluate(() => {
    g3w.app.setupControl.length();
    window.measureControl = measureControls.measure;
    measureControl.toggle(true);
    measureMap.renderSync();
  });
});

Before({ tags: '@scale-workflows' }, async function () {
  await this.corePage.evaluate(() => {
    document.body.insertAdjacentHTML('beforeend', '<div id="scale-control"></div>');
    g3w.app.getCrs = () => measureMap.getView().getProjection().getCode();
  });
  await this.corePage.addScriptTag({ content: instrumentSource(path.resolve('src', 'static', 'map-controls', 'scale.js')) });
  await this.corePage.evaluate(async () => {
    g3w.app.setupControl.scale();
    window.scaleControl = measureControls.scale;
    measureMap.renderSync();
    await coreTestExports.waitFor(() => scaleControl.select.container?.querySelector('input'), 1000);
  });
});

Before({ tags: '@streetview-workflows' }, async function ({ pickle }) {
  const keyed = pickle.tags.some(tag => tag.name === '@streetview-key');
  const preflightFailure = pickle.tags.some(tag => tag.name === '@streetview-preflight-failure');
  await this.corePage.route('https://maps.googleapis.com/maps/api/streetview?*', route => preflightFailure
    ? route.abort('connectionreset')
    : route.fulfill({ contentType: 'text/plain', body: 'offline response' }));
  await this.corePage.route('**/streetviewarrow.png', route => route.fulfill({
    contentType: 'image/png', path: path.resolve('src', 'static', 'images', 'streetviewarrow.png'),
  }));
  await this.corePage.route('https://maps.googleapis.com/maps/api/js?*', route => route.fulfill({
    contentType: 'text/javascript',
    body: `
      window.streetViewFixture = { requests: [], panoramas: [], reject: false };
      window.google = { maps: {
        StreetViewService: class {
          async getPanorama({ location }, callback) {
            streetViewFixture.requests.push(location);
            if (streetViewFixture.reject) throw new Error('ZERO_RESULTS');
            const data = { location: { latLng: { lng: () => location.lng, lat: () => location.lat } } };
            callback(data, 'OK');
            return { data };
          }
        },
        StreetViewPanorama: class {
          constructor(element) {
            if (!element) throw new Error('Street View host is missing');
            this.listeners = {};
            streetViewFixture.panoramas.push(this);
          }
          addListener(name, callback) { this.listeners[name] = callback; }
          setPosition(position) { this.position = position; this.listeners.position_changed(); }
          getPosition() { return this.position; }
          setPov(pov) { this.pov = pov; this.listeners.pov_changed(); }
          getPov() { return this.pov; }
        }
      } };
    `,
  }));
  await this.corePage.evaluate(keyed => {
    g3w.state.vendorkeys = { google: keyed ? 'offline-fixture' : '' };
    window.streetWarnings = [];
    console.warn = (...args) => streetWarnings.push(args.map(String).join(' '));
    window.streetOpened = [];
    window.streetClosed = 0;
    window.open = url => streetOpened.push(url);
    g3w.app.setContent = ({ content }) => {
      document.querySelector('#streetview')?.remove();
      document.body.insertAdjacentHTML('beforeend', content);
    };
    g3w.app.closeContent = () => { streetClosed++; };
  }, keyed);
  await this.corePage.addScriptTag({ content: instrumentSource(path.resolve('src', 'static', 'map-controls', 'streetview.js')) });
  await this.corePage.evaluate(async preflightFailure => {
    g3w.app.setupControl.streetview();
    window.streetControl = measureControls.streetview;
    streetControl.toggle(true);
    measureMap.renderSync();
    await coreTestExports.waitFor(() => window.google && (!preflightFailure || streetWarnings.length), 2000);
  }, preflightFailure);
});

After({ tags: '@map-control-workflows' }, async function () {
  await this.corePage.evaluate(() => {
    measureControls.measure?.toggle(false);
    measureControls.streetview?.toggle(false);
    measureMap.setTarget(null);
  });
});

Then('a line measurement removes points and releases its overlays when disabled', async function () {
  const initial = await this.corePage.evaluate(() => {
    const draw = measureControl.getInteraction();
    draw.appendCoordinates([[0, 0], [100, 0], [100, 100]]);
    measureMap.dispatchEvent({ type: 'pointermove', coordinate: [70, 80], dragging: false });
    return {
      count: draw.get('feature').getGeometry().getCoordinates().length,
      overlays: measureMap.getOverlays().getLength(),
      text: document.querySelector('.mtooltip-measure').textContent,
    };
  });
  assert.ok(initial.count >= 4);
  assert.ok(initial.overlays >= 1);
  assert.match(initial.text, /\d+\.\d{2} m/);
  const bounds = await this.corePage.locator('#fixture').boundingBox();
  await this.corePage.mouse.click(bounds.x + 200, bounds.y + 160, { button: 'right' });
  const corrected = await this.corePage.evaluate(() => {
    const draw = measureControl.getInteraction();
    const right = draw.get('feature').getGeometry().getCoordinates().length;
    measureMap.getViewport().dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    const removed = draw.get('feature').getGeometry().getCoordinates().length;
    draw.appendCoordinates([[100, 0], [100, 100]]);
    draw.finishDrawing();
    measureMap.renderSync();
    const completed = {
      feature: draw.get('feature'), tooltip: !!document.querySelector('.mtooltip-static'),
      layers: measureMap.getLayers().getLength(), features: measureMap.getLayers().item(0).getSource().getFeatures().length,
    };
    measureControl.toggle(false);
    return {
      right, removed, completed,
      overlays: measureMap.getOverlays().getLength(), layers: measureMap.getLayers().getLength(), active: draw.getActive(),
    };
  });
  assert.equal(corrected.right, initial.count - 1);
  assert.equal(corrected.removed, corrected.right - 1);
  assert.deepEqual(corrected.completed, { feature: null, tooltip: true, layers: 1, features: 1 });
  assert.equal(corrected.overlays, 0);
  assert.equal(corrected.layers, 0);
  assert.equal(corrected.active, false);
});

Then('switching measurement types clears the old drawing and restores the default tool', async function () {
  const result = await this.corePage.evaluate(async () => {
    await Vue.nextTick();
    g3w.app.setupControl.area();
    const types = [...measureControl.types];
    const original = measureControl.getInteraction();
    original.appendCoordinates([[0, 0], [100, 0]]);
    await coreTestExports.waitFor(() => document.querySelector('.usermessage-tool x-select')?.container?.querySelector('x-option[value="area"]'), 1000);
    const select = document.querySelector('.usermessage-tool x-select');
    select.select(select.container.querySelector('x-option[value="area"]'));
    await Vue.nextTick();
    const area = measureControl.getInteraction();
    const switched = {
      lengthActive: original.getActive(), cleared: original.get('feature'),
      areaActive: area.getActive(), changed: area !== original,
    };
    area.appendCoordinates([[0, 0], [100, 0], [100, 100], [0, 100]]);
    const text = document.querySelector('.mtooltip-measure').textContent;
    area.finishDrawing();
    measureMap.renderSync();
    measureControl.toggle(false);
    await Vue.nextTick();
    return {
      types, switched, text,
      reset: measureControl.getInteraction() === original,
      interactions: { original: measureMap.getInteractions().getArray().includes(original), area: measureMap.getInteractions().getArray().includes(area) },
      tools: document.querySelectorAll('.usermessage-tool').length, overlays: measureMap.getOverlays().getLength(),
    };
  });
  assert.deepEqual(result.types, ['length', 'area']);
  assert.deepEqual(result.switched, { lengthActive: false, cleared: null, areaActive: true, changed: true });
  assert.match(result.text, /Area: \d+\.\d{2} m\u00b2/);
  assert.equal(result.reset, true);
  assert.deepEqual(result.interactions, { original: true, area: false });
  assert.equal(result.tools, 0);
  assert.equal(result.overlays, 0);
});

Then('custom scale input changes resolution and rejects invalid values', async function () {
  const result = await this.corePage.evaluate(async () => {
    const select = scaleControl.select;
    const input = select.container.querySelector('input');
    input.value = '1:789';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await coreTestExports.waitFor(() => select.value === '1:789', 2000);
    const resolution = measureMap.getView().getResolution();
    const expected = g3w.utils.getResolutionFromScale(789, 'm');
    const rejected = [];
    for (const value of ['1:0', '-5', '2.5', 'invalid', String(scaleControl.scales[0] + 1)]) {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await coreTestExports.waitFor(() => input.value === '', 2000);
      rejected.push({ resolution: measureMap.getView().getResolution(), value: select.value });
    }
    return { resolution, expected, rejected };
  });
  assert.ok(Math.abs(result.resolution - result.expected) < 1e-10);
  assert.deepEqual(result.rejected, Array(5).fill({ resolution: result.resolution, value: '1:789' }));
});

Then('map scale changes replace custom options and survive replacing the view', async function () {
  const result = await this.corePage.evaluate(async () => {
    const select = scaleControl.select;
    const initialOptions = [...select.container.querySelectorAll('x-option')].map(option => option.value);
    const scales = [];
    for (const [index, scale] of [1234, 876].entries()) {
      if (index) {
        measureMap.setView(new ol.View({ center: [50, 50], zoom: 18 }));
      }
      const view = measureMap.getView();
      view.setResolution(g3w.utils.getResolutionFromScale(scale, 'm'));
      measureMap.renderSync();
      const expected = `1:${parseInt(g3w.utils.getScaleFromResolution(view.getResolution(), 'm'))}`;
      await coreTestExports.waitFor(() => select.value === expected && [...select.container.querySelectorAll('x-option')].some(option => option.value === expected), 2000);
      scales.push({
        expected, value: select.value,
        custom: [...select.container.querySelectorAll('x-option')].map(option => option.value).filter(value => !initialOptions.includes(value)),
        preserved: initialOptions.every(value => [...select.container.querySelectorAll('x-option')].some(option => option.value === value)),
      });
    }
    const predefined = scaleControl.scales.at(-1);
    select.select(`1:${predefined}`);
    measureMap.renderSync();
    return {
      scales, selected: select.value, predefined: `1:${predefined}`,
      resolution: measureMap.getView().getResolution(),
      expectedResolution: g3w.utils.getResolutionFromScale(predefined, 'm'),
    };
  });
  for (const scale of result.scales) {
    assert.equal(scale.value, scale.expected);
    assert.deepEqual(scale.custom, [scale.expected]);
    assert.equal(scale.preserved, true);
  }
  assert.equal(result.selected, result.predefined);
  assert.ok(Math.abs(result.resolution - result.expectedResolution) < 1e-10);
});

Then('picking a map position opens the public panorama URL without an API key', async function () {
  const expected = await this.corePage.evaluate(() => {
    const coordinates = measureMap.getCoordinateFromPixel([200, 160]);
    return { coordinates, lonlat: ol.proj.toLonLat(coordinates) };
  });
  const bounds = await this.corePage.locator('#fixture').boundingBox();
  await this.corePage.mouse.click(bounds.x + 200, bounds.y + 160);
  const result = await this.corePage.evaluate(async () => {
    await coreTestExports.waitFor(() => streetOpened.length, 2000);
    const layer = measureMap.getLayers().item(0);
    const feature = layer.getSource().getFeatures()[0];
    measureMap.renderSync();
    return {
      urls: streetOpened, coordinates: feature.getGeometry().getCoordinates(),
      rotation: layer.getStyleFunction()(feature, measureMap.getView().getResolution())[1].getImage().getRotation(),
      warnings: streetWarnings, requests: streetViewFixture.requests,
    };
  });
  assert.deepEqual(result.coordinates, expected.coordinates);
  const url = new URL(result.urls[0]);
  assert.equal(result.urls.length, 1);
  assert.equal(url.origin, 'https://www.google.com');
  assert.equal(url.searchParams.get('map_action'), 'pano');
  const [lat, lng] = url.searchParams.get('viewpoint').split(',').map(Number);
  assert.ok(Math.abs(lng - expected.lonlat[0]) < 1e-10);
  assert.ok(Math.abs(lat - expected.lonlat[1]) < 1e-10);
  assert.equal(result.rotation, -Math.PI / 2);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.requests, []);
});

Then('panorama position and heading update the map marker after a preflight failure', async function () {
  const result = await this.corePage.evaluate(async () => {
    const coordinate = ol.proj.fromLonLat([5, 45]);
    streetControl.showStreetView(coordinate);
    await coreTestExports.waitFor(() => streetViewFixture.panoramas.length, 2000);
    const panorama = streetViewFixture.panoramas[0];
    panorama.setPosition({ lng: () => 8, lat: () => 46 });
    panorama.setPov({ heading: 135 });
    const layer = measureMap.getLayers().item(0);
    const feature = layer.getSource().getFeatures()[0];
    measureMap.renderSync();
    const displayed = {
      coordinates: feature.getGeometry().getCoordinates(), center: measureMap.getView().getCenter(),
      rotation: layer.getStyleFunction()(feature, measureMap.getView().getResolution())[1].getImage().getRotation(),
    };
    g3w.app.emit('closecontent');
    const cleared = layer.getSource().getFeatures().length;
    streetControl.toggle(false);
    return {
      displayed, expected: ol.proj.fromLonLat([8, 46]), cleared,
      active: streetControl.active, toggled: streetControl.isToggled(), closed: streetClosed,
      warnings: streetWarnings, requests: streetViewFixture.requests,
    };
  });
  assert.deepEqual(result.displayed.coordinates, result.expected);
  assert.deepEqual(result.displayed.center, result.expected);
  assert.ok(Math.abs(result.displayed.rotation - Math.PI / 4) < 1e-10);
  assert.equal(result.cleared, 0);
  assert.equal(result.active, false);
  assert.equal(result.toggled, false);
  assert.equal(result.closed, 1);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /Failed to fetch/);
  assert.equal(result.requests.length, 1);
  assert.ok(Math.abs(result.requests[0].lng - 5) < 1e-10);
  assert.ok(Math.abs(result.requests[0].lat - 45) < 1e-10);
});

Then('a rejected panorama request disables the tool and clears its marker', async function () {
  const result = await this.corePage.evaluate(async () => {
    streetViewFixture.reject = true;
    streetControl.showStreetView(ol.proj.fromLonLat([5, 45]));
    await coreTestExports.waitFor(() => !streetControl.isToggled(), 2000);
    return {
      active: streetControl.active, features: measureMap.getLayers().item(0).getSource().getFeatures().length,
      closed: streetClosed, requests: streetViewFixture.requests.length, warnings: streetWarnings,
    };
  });
  assert.deepEqual(result, { active: false, features: 0, closed: 1, requests: 1, warnings: [] });
});
