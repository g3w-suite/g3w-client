const assert = require('node:assert/strict');
const { Before, After, AfterAll, Then, When } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const { openCorePage } = require('../support/core-browser');

let browser;

Before({ tags: '@core-runtime', timeout: 60_000 }, async function () {
  browser ||= await chromium.launch();
  this.coreBrowser = browser;
  const { context, page } = await openCorePage(this.coreBrowser);
  this.coreContext = context;
  this.corePage = page;
});

After({ tags: '@core-runtime' }, async function () {
  if (this.coreContext) {
    await this.coreContext.close();
  }
});

AfterAll(async function () {
  if (browser) {
    await browser.close();
    browser = undefined;
  }
});

Then('core event listeners run once and setters notify their observers', async function () {
  const result = await this.corePage.evaluate(() => {
    const calls = [];
    const emitter = new g3w.Emitter({
      setters: { update(value) { calls.push(`update:${value}`); return value * 2; } },
    });
    const listener = value => { calls.push(`persistent:${value}`); };
    emitter.on('change', listener);
    emitter.on('change', listener);
    emitter.once('change', value => { calls.push(`once:${value}`); });
    emitter.emit('change', 1);
    emitter.emit('change', 2);
    emitter.off('change', listener);
    emitter.emit('change', 3);
    emitter.onbefore('update', value => { calls.push(`before:${value}`); });
    emitter.onafter('update', value => { calls.push(`after:${value}`); });
    return { calls, returned: emitter.update(4) };
  });
  assert.deepEqual(result, {
    calls: ['persistent:1', 'once:1', 'persistent:2', 'before:4', 'update:4', 'after:4'],
    returned: 8,
  });
});

Then('core components and panels mount and release their Vue instances', async function () {
  const result = await this.corePage.evaluate(async () => {
    const events = [];
    const component = new g3w.Component({
      id: 'test-component',
      vueComponentObject: { template: '<article>Component body</article>' },
    });
    component.on('mount', () => { events.push('mount'); });
    component.on('unmount', () => { events.push('unmount'); });
    await component.mount(document.querySelector('#fixture'), true);
    const text = document.querySelector('#fixture').textContent;
    component.setOpen(true);
    await component.unmount();
    let cleared = false;
    let closed = false;
    const panel = new g3w.Panel({
      panel: new Vue({
        template: '<aside>Panel body</aside>',
        methods: { onClose() { closed = true; } },
      }),
      service: { clear() { cleared = true; } },
    });
    await panel.mount(document.querySelector('#fixture'));
    const panelText = document.querySelector('#fixture').textContent;
    await panel.unmount();
    return {
      events, text, panelText, cleared, closed,
      open: component.open,
      released: component.internalComponent === null && panel.internalPanel === null,
      children: document.querySelector('#fixture').childElementCount,
    };
  });
  assert.deepEqual(result, {
    events: ['mount', 'unmount'], text: 'Component body', panelText: 'Panel body',
    cleared: true, closed: true, open: false, released: true, children: 0,
  });
});

Then('core translations resolve overrides and nested registered strings', async function () {
  const result = await this.corePage.evaluate(() => {
    g3w.gettext.register('en', { forms: { save: 'Save' }, english: 'Fallback' });
    g3w.gettext.register('it', { forms: { save: 'Salva' } });
    g3w.state.language = 'it';
    const registered = g3w.gettext('forms.save');
    window.initConfig.locales.it = { 'forms.save': 'Override' };
    return {
      registered,
      override: g3w.gettext('forms.save'),
      fallback: g3w.gettext('english'),
      missing: g3w.gettext('unknown-key'),
    };
  });
  assert.deepEqual(result, {
    registered: 'Salva', override: 'Override', fallback: 'Fallback', missing: 'unknown-key',
  });
});

Then('application state returns registered map projections', async function () {
  const result = await this.corePage.evaluate(async () => {
    const projection = await g3w.state.projections.set('EPSG:4326');
    const cached = g3w.state.projections.get({ epsg: 4326 });
    return {
      same: projection === cached,
      units: cached.getUnits(),
      transformed: ol.proj.transform([12, 45], 'EPSG:4326', 'EPSG:3857'),
    };
  });
  assert.equal(result.same, true);
  assert.equal(result.units, 'degrees');
  assert.ok(Math.abs(result.transformed[0] - 1335833.8895192828) < 0.001);
  assert.ok(Math.abs(result.transformed[1] - 5621521.486192066) < 0.001);
});

Then('a compatible plugin registers and announces readiness', async function () {
  const result = await this.corePage.evaluate(async () => {
    g3w.state.project.getGid = () => 'qdjango:1';
    g3w.state.layout.app = { rightpanel: { width: 40, height: 60 } };
    g3w.state.plugins.push('bdd-plugin');
    const plugin = new g3w.Plugin({ name: 'bdd-plugin', config: { gid: 'qdjango:1' } });
    try {
      const compatible = plugin.registerPlugin('qdjango:1');
      const ready = plugin.isReady();
      plugin.setReady(true);
      const resolved = await ready;
      await new Promise(resolve => setTimeout(resolve, 10));
      return {
        compatible, resolved,
        registered: g3w.app.getPlugin('bdd-plugin') === plugin,
        loading: g3w.state.plugins.includes('bdd-plugin'),
        width: g3w.state.layout['bdd-plugin'].rightpanel.width,
      };
    } finally {
      clearTimeout(plugin._timeout);
    }
  });
  assert.deepEqual(result, { compatible: true, resolved: true, registered: true, loading: false, width: 40 });
});

Then('a layer selection tracks included and excluded feature IDs', async function () {
  const result = await this.corePage.evaluate(async () => {
    Object.assign(g3w.state.project, {
      state: { WMSUrl: '/ows/' },
      getType: () => 'qdjango',
      getId: () => 1,
      getProjection: () => ol.proj.get('EPSG:3857'),
      getRelations: () => [],
    });
    const layer = new g3w.Layer({
      id: 'records', name: 'Records', geometrytype: 'NoGeometry',
      servertype: 'QGIS', source: { type: 'postgres' },
    });
    await layer.fidsIn(10);
    const included = layer.isSelected(10);
    const absent = layer.isSelected(20);
    await layer.inverseSelection();
    return {
      included, absent,
      excluded: layer.isSelected(10),
      otherIncluded: layer.isSelected(20),
    };
  });
  assert.deepEqual(result, { included: true, absent: false, excluded: false, otherIncluded: true });
});

Then('a map control disables interaction and restores its click handler', async function () {
  const result = await this.corePage.evaluate(() => {
    const calls = [];
    const control = new g3w.Control({
      name: 'BDD Tool', enabled: true, onclick() { calls.push('original'); },
    });
    control._interaction = { setActive(value) { calls.push(`active:${value}`); } };
    control.setEnable(false);
    const disabledClass = control.element.querySelector('button').classList.contains('g3w-ol-disabled');
    control.overwriteOnClickEvent(() => { calls.push('temporary'); });
    control._onclick();
    control.resetOriginalOnClickEvent();
    control._onclick();
    control.setVisible(false);
    return { calls, disabledClass, enabled: control.getEnable(), display: control.element.style.display };
  });
  assert.deepEqual(result, {
    calls: ['active:false', 'temporary', 'original'], disabledClass: true, enabled: false, display: 'none',
  });
});

Then('the SDK bridge shares storage and converts fetched features', async function () {
  const result = await this.corePage.evaluate(async () => {
    g3wsdk.core.ApplicationService.setLocalItem({ id: 'saved', data: { layer: 'roads' } });
    const stored = g3w.app.getLocalStorage('saved');
    g3w.app.setLocalStorage('saved', { layer: 'buildings' });
    const legacy = g3wsdk.core.ApplicationService.getLocalItem('saved');
    const layer = {
      async getFeatureByFids({ fids }) {
        return fids.map(id => ({
          id, properties: { label: 'Station' }, geometry: { type: 'Point', coordinates: [12, 45] },
        }));
      },
    };
    const response = await g3w.app['getData/search:fids']({ layer, fids: [7] });
    const feature = response.data[0].features[0];
    g3w.app.emit('app-complete');
    return {
      stored, legacy,
      id: feature.getId(),
      coordinates: feature.getGeometry().getCoordinates(),
      label: feature.get('label'),
      fid: feature.get('g3w_fid'),
      query: response.query,
      complete: g3wsdk.core.ApplicationService.complete,
    };
  });
  assert.deepEqual(result, {
    stored: { layer: 'roads' }, legacy: { layer: 'buildings' }, id: 7,
    coordinates: [12, 45], label: 'Station', fid: 7,
    query: { type: 'search', fids: [7] }, complete: true,
  });
});

Then('the map scale constants produce the expected metre resolution', async function () {
  const result = await this.corePage.evaluate(() => ({
    resolution: g3w.utils.getResolutionFromScale(10000, 'm'),
    scale: g3w.utils.getScaleFromResolution(10000 / (39.37 * 96), 'm'),
  }));
  assert.ok(Math.abs(result.resolution - 2.645838625010583) < 1e-10);
  assert.equal(result.scale, 10000);
});

Then('iframe commands apply valid centers and reject invalid centers', async function () {
  const result = await this.corePage.evaluate(async () => {
    const { IframeApp } = window.coreTestExports;
    const changes = [];
    const originalGetMap = g3w.app.getMap;
    g3w.app.getMap = () => ({ getView: () => ({
      setCenter(value) { changes.push(['center', value]); },
      setZoom(value) { changes.push(['zoom', value]); },
    }) });
    try {
      const center = await IframeApp.prototype['app:zoomtocoordinates']({ coordinates: [10, 20] });
      let rejected = false;
      try {
        await IframeApp.prototype['app:zoomtocoordinates']({ coordinates: [10] });
      } catch (error) {
        rejected = Array.isArray(error) && error.length === 1;
      }
      return { center, changes, rejected };
    } finally {
      g3w.app.getMap = originalGetMap;
    }
  });
  assert.deepEqual(result, { center: [10, 20], changes: [['center', [10, 20]], ['zoom', 6]], rejected: true });
});

Then('the DOM facade delegates events and removes namespaced listeners', async function () {
  const result = await this.corePage.evaluate(() => {
    document.querySelector('#fixture').innerHTML = '<button class="action">Run</button>';
    const calls = [];
    const target = $('#fixture');
    target.on('click.test', '.action', function () { calls.push(this.textContent); });
    $('.action').trigger('click');
    target.off('.test');
    $('.action').trigger('click');
    return { calls, sameFacade: $ === jQuery, feature: new ol.Feature(new ol.geom.Point([1, 2])).getGeometry().getCoordinates() };
  });
  assert.deepEqual(result, { calls: ['Run'], sameFacade: true, feature: [1, 2] });
});

Then('the date facade handles leap days and invalid strict dates', async function () {
  const result = await this.corePage.evaluate(() => ({
    leap: moment('2024-02-28', 'YYYY-MM-DD', true).add(1, 'day').format('YYYY-MM-DD'),
    next: moment('2024-02-29', 'YYYY-MM-DD', true).add(1, 'day').format('YYYY-MM-DD'),
    invalid: moment('2023-02-29', 'YYYY-MM-DD', true).isValid(),
    unchanged: moment('2024-01-31', 'YYYY-MM-DD', true).clone().add(1, 'month').format('YYYY-MM-DD'),
  }));
  assert.deepEqual(result, { leap: '2024-02-29', next: '2024-03-01', invalid: false, unchanged: '2024-02-29' });
});

Then('the select facade synchronizes values and restores the original field', async function () {
  const result = await this.corePage.evaluate(async () => {
    document.querySelector('#fixture').innerHTML = '<select id="layer"><option value="roads">Roads</option><option value="parcels">Parcels</option></select>';
    const select = $('#layer');
    select.select2();
    select.val('parcels').trigger('change');
    await Vue.nextTick();
    const selected = select.select2('data').map(item => ({ id: item.id, text: item.text }));
    const widget = !!document.querySelector('x-select');
    select.select2('destroy');
    return { selected, widget, removed: !document.querySelector('x-select'), value: select.val(), instance: !!select.data('select2') };
  });
  assert.deepEqual(result, {
    selected: [{ id: 'parcels', text: 'Parcels' }], widget: true, removed: true, value: 'parcels', instance: false,
  });
});

Then('the date-time facade formats values and emits change events', async function () {
  const result = await this.corePage.evaluate(() => {
    document.querySelector('#fixture').innerHTML = '<input id="date">';
    const field = $('#date');
    const changes = [];
    field.on('dp.change', event => { changes.push(event.date.format('YYYY-MM-DD')); });
    field.datetimepicker({ format: 'YYYY-MM-DD', useCurrent: false });
    const picker = field.data('DateTimePicker');
    picker.date(moment('2024-02-29', 'YYYY-MM-DD', true));
    const value = field.val();
    field[0].focus();
    const shown = !!document.querySelector('.datetimepicker');
    picker.hide();
    return { value, changes, shown, removed: !document.querySelector('.datetimepicker') };
  });
  assert.deepEqual(result, { value: '2024-02-29', changes: ['2024-02-29'], shown: true, removed: true });
});

async function startEntry(world, entry) {
  await world.coreContext.close();
  const { context, page } = await openCorePage(world.coreBrowser, entry);
  world.coreContext = context;
  world.corePage = page;
}

When('the production entry starts with an unknown project', { timeout: 60_000 }, async function () {
  await startEntry(this, 'index.prod.js');
});

Then('startup shows the missing project error and registers global directives', async function () {
  await this.corePage.waitForSelector('.error-page .trace');
  const result = await this.corePage.evaluate(() => ({
    trace: document.querySelector('.trace').textContent,
    spinner: !!document.querySelector('#startingspinner'),
    directives: ['disabled', 'select2', 't', 't-tooltip'].every(name => !!Vue.options.directives[name]),
    icon: Vue.prototype.$fa('download'),
  }));
  assert.match(result.trace, /Project doesn't exist missing-project/);
  assert.equal(result.spinner, false);
  assert.equal(result.directives, true);
  assert.equal(result.icon, 'fas fa-download');
});

When('the development entry delegates to the production bootstrap', { timeout: 60_000 }, async function () {
  await startEntry(this, 'index.dev.js');
});

Then('development overrides and diagnostics are enabled', async function () {
  const result = await this.corePage.evaluate(() => {
    g3w.app.emit('initconfig', initConfig);
    return {
      configApplied: window.developmentConfigApplied,
      pageLength: g3w.constants.PAGELENGTHS[0],
      highContrast: localStorage.getItem('map:accessibility:high_contrast'),
      customLinks: initConfig.header_custom_links.some(link => link.title === 'Add Layer'),
      bootstrapOrder: window.bootstrapOrder,
    };
  });
  assert.equal(result.configApplied, true);
  assert.equal(result.pageLength, 2);
  assert.equal(result.highContrast, 'true');
  assert.equal(result.customLinks, true);
  assert.deepEqual(result.bootstrapOrder, { configured: true, pageLength: 2 });
});
