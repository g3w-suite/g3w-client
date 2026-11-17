const assert = require('node:assert/strict');
const { Before, After, AfterAll, Then, When } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const { openCorePage } = require('../support/core-browser');
const { closeCoreContext } = require('../support/function-coverage');

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
    await closeCoreContext(this.coreContext);
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
  await closeCoreContext(world.coreContext);
  world.coreContext = undefined;
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

Then('setter observers preserve priority one-shot delivery and keyed removal', async function () {
  const result = await this.corePage.evaluate(() => {
    class Settings extends g3w.Emitter {
      constructor() { super({ setters: ['write'] }); }
      write(value) { this.value = value; return value; }
    }
    const settings = new Settings();
    const calls = [];
    const removable = settings.onbefore('write', () => { calls.push('removed'); }, 5);
    settings.un('write', removable);
    settings.oncebefore('write', () => { calls.push('first-before'); }, 3);
    settings.onbefore('write', () => { calls.push('before'); }, 1);
    settings.onceafter('write', () => { calls.push('first-after'); });
    settings.onafter('write', () => { calls.push('after'); });
    settings.write(2);
    settings.write(3);
    settings.set('label', 'Settings');
    const values = [settings.get('value'), settings.get('label'), settings.get('write')];
    const key = settings.on('temporary', () => { calls.push('temporary'); }, 0, false, true);
    settings.off('temporary', key);
    settings.emit('temporary');
    const warnings = [];
    const warn = console.warn;
    try {
      console.warn = message => warnings.push(message);
      new g3w.Emitter().removeAllListeners();
    } finally {
      console.warn = warn;
    }
    return { calls, values, deprecated: warnings.some(message => message.includes('removeAllListeners') && message.includes('off()')) };
  });
  assert.deepEqual(result, {
    calls: ['first-before', 'before', 'first-after', 'after', 'before', 'after'],
    values: [3, 'Settings', null],
    deprecated: true,
  });
});

Then('component configuration survives service replacement and mounting', async function () {
  const result = await this.corePage.evaluate(async () => {
    const component = new g3w.Component({
      id: 'initial', title: 'Initial', visible: true,
      service: { state: { label: 'Original' } },
      vueComponentObject: { template: '<article>Configured content</article>' },
    });
    component.setId('configured');
    component.setTitle('Configured');
    component.setVisible(false);
    component.setLoading(true);
    component.setDisabled(true);
    component.setOpen(true);
    component.setService({ state: { label: 'Replacement' } });
    const configured = {
      id: component.getId(), title: component.getTitle(), visible: component.getVisible(),
      open: component.getOpen(), loading: component.loading, disabled: component.disabled,
      service: component.getService().state.label, stateAlias: component.state === component,
    };
    const internal = component.getInternalComponent();
    const mounted = await component.mount('#fixture');
    const text = internal.$el.textContent;
    component.setLoading();
    component.setDisabled();
    await component.unmount();
    await component.unmount();
    return {
      configured, mounted, text, released: component.getInternalComponent() === null,
      loading: component.loading, disabled: component.disabled, open: component.getOpen(),
    };
  });
  assert.deepEqual(result, {
    configured: {
      id: 'configured', title: 'Configured', visible: false, open: true,
      loading: true, disabled: true, service: 'Replacement', stateAlias: true,
    },
    mounted: true, text: 'Configured content', released: true,
    loading: false, disabled: false, open: false,
  });
});

Then('sidebar panels restore their predecessor and release their services', async function () {
  const result = await this.corePage.evaluate(async () => {
    document.querySelector('#fixture').innerHTML = '<div id="sidebar-panel-placeholder"></div>';
    const cleared = [];
    const events = [];
    const first = new g3w.Panel({
      id: 'first', title: 'First panel', service: { clear() { cleared.push('first'); } },
      vueComponentObject: {
        template: '<article>First body</article>',
        methods: { onShow() { events.push('show'); }, onClose() { events.push('close'); } },
      },
    });
    const second = new g3w.Panel({ id: 'second', title: 'Second panel' });
    second.setService({ clear() { cleared.push('second'); } });
    second.setInternalPanel(new Vue({ template: '<aside>Second body</aside>' }));
    const firstInternal = first.getInternalPanel();
    first.show();
    await coreTestExports.waitFor(() => g3w.state.sidebar.contentsdata.length === 1, 1000);
    second.show();
    await coreTestExports.waitFor(() => g3w.state.sidebar.contentsdata.length === 2, 1000);
    const stacked = [g3w.state.sidebar.title, firstInternal.$el.style.display];
    const metadata = [first.getId(), first.getTitle(), typeof second.getService().clear];
    second.close();
    await coreTestExports.waitFor(() => g3w.state.sidebar.contentsdata.length === 1, 1000);
    const restored = [g3w.state.sidebar.title, firstInternal.$el.style.display];
    first.close();
    await coreTestExports.waitFor(() => g3w.state.sidebar.contentsdata.length === 0, 1000);
    return {
      metadata, stacked, restored, cleared, events,
      released: first.getInternalPanel() === null && second.getInternalPanel() === null,
      sidebarOpen: document.body.classList.contains('sidebar-open'),
    };
  });
  assert.deepEqual(result, {
    metadata: ['first', 'First panel', 'function'], stacked: ['Second panel', 'none'],
    restored: ['First panel', 'block'], cleared: ['second', 'first'],
    events: ['show', 'close'], released: true, sidebarOpen: true,
  });
});

Then('plugin services exchange events configuration translations and dependency APIs', async function () {
  const result = await this.corePage.evaluate(async () => {
    const fonts = {};
    Vue.prototype.g3wtemplate = { addFontClass({ name, className }) { fonts[name] = className; } };
    g3w.state.project.getGid = () => 'qdjango:1';
    g3w.state.layout.app = { rightpanel: { width: 40, height: 60 } };
    initConfig.plugins.dependency = {};
    const service = new g3wsdk.core.plugin.PluginService();
    const dependency = new g3w.Plugin({ name: 'dependency', config: {}, api: { version: 7 } });
    const plugin = new g3w.Plugin({
      name: 'extension', config: { gid: 'qdjango:1' }, service,
      fontClasses: [{ name: 'extension-icon', className: 'fas fa-map' }],
      i18n: { en: { title: 'Extension' } },
    });
    try {
      g3w.app.registerPlugin(dependency);
      dependency.setReady(true);
      plugin.addDependency('dependency');
      const dependencies = await plugin.getDependencyPluginsObject();
      plugin.registerLocale('en', { shared: { label: 'Shared label' } });
      service.init({ gid: 'qdjango:1' });
      service.setConfig({ gid: 'qdjango:2' });
      service.setApi({ api: { name: 'own' } });
      service.setApi({ dependency: 'dependency', api: dependencies.dependency });
      service.initEvents(['updated', 'once']);
      const events = [];
      service.subscribeEvent({ name: 'updated', owner: 'subscriber', listener: value => events.push(value.value) });
      service.subscribeEvent({ name: 'once', owner: 'subscriber', once: true, listener: () => events.push('once') });
      service.triggerEvent({ name: 'updated', params: { value: 'updated' } });
      service.triggerEvent({ name: 'once' });
      service.triggerEvent({ name: 'once' });
      service.name = 'extension';
      g3w.state.layout.__current = 'other';
      await Vue.nextTick();
      plugin.setCurrentLayout();
      await Vue.nextTick();
      service.resetCurrentLayout();
      const layout = g3w.state.layout.__current;
      const metadata = {
        name: plugin.getName(), gid: plugin.getConfig().gid, sameService: plugin.getService() === service,
        sameOwner: service.getPlugin() === plugin,
        project: plugin.getProject() === service.getCurrentProject(),
        serviceGid: service.getGid(), serviceConfig: service.getConfig(),
        ownApi: service.getApi(), dependencyApi: service.getApi({ dependency: 'dependency' }).version,
        iframe: service.isIframe(), load: service.loadPlugin(),
        title: g3w.gettext('plugins.extension.title'), shared: g3w.gettext('shared.label'),
      };
      plugin.setHookLoading();
      service.clear();
      return { metadata, fonts, events, layout };
    } finally {
      service.unwatch();
      service.vm.$destroy();
      clearTimeout(plugin._timeout);
      clearTimeout(dependency._timeout);
    }
  });
  assert.deepEqual(result, {
    metadata: {
      name: 'extension', gid: 'qdjango:1', sameService: true, sameOwner: true, project: true,
      serviceGid: '2', serviceConfig: { gid: 'qdjango:2' }, ownApi: { name: 'own' },
      dependencyApi: 7, iframe: false, load: true,
      title: 'Extension', shared: 'Shared label',
    },
    fonts: { 'extension-icon': 'fas fa-map' }, events: ['updated', 'once'], layout: 'other',
  });
});

Then('only the timed-out plugin loses its loading indicator and layout', async function () {
  await this.corePage.clock.install();
  const before = await this.corePage.evaluate(() => {
    g3w.state.plugins = ['failed', 'still-loading'];
    g3w.state.layout.failed = { rightpanel: { width: 20 } };
    window.failedPlugin = new g3w.Plugin({ name: 'failed', config: {} });
    return g3w.state.plugins.slice();
  });
  await this.corePage.clock.fastForward(10_001);
  const after = await this.corePage.evaluate(() => ({
    loading: g3w.state.plugins.slice(), layoutRemoved: !('failed' in g3w.state.layout),
  }));
  assert.deepEqual(before, ['failed', 'still-loading']);
  assert.deepEqual(after, { loading: ['still-loading'], layoutRemoved: true });
});

Then('lazy plugin translations switch language using local responses', async function () {
  await this.corePage.route('http://core.test/fixture-locales/*.js', route => route.fulfill({
    contentType: 'text/javascript',
    body: `export default ${JSON.stringify({ title: route.request().url().endsWith('/it.js') ? 'Titolo' : 'Title' })};`,
  }));
  const result = await this.corePage.evaluate(async () => {
    const plugin = new g3w.Plugin({ name: 'lazy', config: {} });
    try {
      await plugin.setI18n('http://core.test/fixture-locales/');
      const english = g3w.gettext('plugins.lazy.title');
      g3w.state.language = 'it';
      await Vue.nextTick();
      await coreTestExports.waitFor(() => g3w.gettext('plugins.lazy.title') === 'Titolo', 1000);
      return { english, italian: g3w.gettext('plugins.lazy.title') };
    } finally {
      clearTimeout(plugin._timeout);
    }
  });
  assert.deepEqual(result, { english: 'Title', italian: 'Titolo' });
});

Then('map controls coordinate interactions and restore their event handlers', async function () {
  const result = await this.corePage.evaluate(async () => {
    const map = new ol.Map({
      target: 'fixture', layers: [], controls: [], interactions: [],
      view: new ol.View({ center: [0, 0], zoom: 2 }),
    });
    const calls = [];
    let release;
    const completion = new Promise(resolve => { release = resolve; });
    const control = new g3w.Control({
      name: 'Selection', position: 'br', clickmap: true, cursorClass: 'selection-cursor',
      interactionClass: ol.interaction.Interaction,
      interactionClassOptions: { handleEvent: () => true },
      spatialMethod: 'intersects', geometryTypes: ['Point'],
      onclick: async () => { calls.push('click'); await completion; },
      onSetMap: ({ setter }) => calls.push(setter),
      onToggled: value => calls.push(`toggled:${value}`),
    });
    const other = new g3w.Control({ name: 'Other', enabled: true });
    try {
      map.addControl(control);
      map.addControl(other);
      control.setLayers([{ id: 'roads' }]);
      control.setGeometryTypes(['Polygon']);
      const eventKey = control.on('test-event', () => calls.push('original'));
      control.setEventKey({ eventType: 'test-event', eventKey });
      control.overwriteEventHandler({ eventType: 'test-event', handler: () => calls.push('replacement') });
      control.dispatchEvent('test-event');
      control.resetOriginalHandlerEvent('test-event');
      control.dispatchEvent('test-event');
      control.element.querySelector('button').click();
      const loading = control.element.querySelector('button').classList.contains('g3w-ol-disabled');
      release();
      await completion;
      await Promise.resolve();
      const active = control.getInteraction().getActive();
      const cursor = map.getViewport().classList.contains('selection-cursor');
      other.toggle(true);
      control.disable();
      const disabled = control.element.classList.contains('g3w-disabled');
      control.enable();
      control.setVisible(false);
      control.showHide();
      const state = {
        clickmap: control.isClickMap(), active, cursor, toggled: control.isToggled(),
        other: other.isToggled(), disabled, reenabled: !control.element.classList.contains('g3w-disabled'),
        visible: control.isVisible(), display: control.element.style.display,
        position: control.getPosition(), geometries: control.getGeometryTypes(), layers: control.layers,
        spatialMethod: control.getSpatialMethod(), loading,
        loaded: !control.element.querySelector('button').classList.contains('g3w-ol-disabled'),
      };
      const native = new ol.control.Control({ element: document.createElement('div') });
      const wrapped = new g3w.Control({ ol: native, position: 'bl' });
      map.addControl(wrapped);
      const wrappedControl = wrapped.getOlControl() === native;
      return { state, calls: calls.slice(), wrappedControl };
    } finally {
      map.getControls().clear();
      map.setTarget(null);
    }
  });
  assert.deepEqual(result.state, {
    clickmap: true, active: true, cursor: true, toggled: false, other: true,
    disabled: true, reenabled: true, visible: false, display: 'block',
    position: { top: false, left: false, bottom: true, right: true },
    geometries: ['Polygon'], layers: [{ id: 'roads' }], spatialMethod: 'intersects',
    loading: true, loaded: true,
  });
  assert.deepEqual(result.calls, ['before', 'after', 'replacement', 'original', 'toggled:true', 'click', 'toggled:false']);
  assert.equal(result.wrappedControl, true);
});

Then('spatial tools synchronize their method and close their message dialog', async function () {
  const result = await this.corePage.evaluate(async () => {
    const control = new g3w.Control({ name: 'Spatial', enabled: true });
    control.initInteraction({ spatialMethod: 'intersects' });
    control.createControlTool({ type: 'spatialMethod' });
    control.showToggledTool();
    const dialog = document.querySelector('.usermessage-tool');
    const instance = Array.from(dialog.children).find(element => element.__vue__)?.__vue__;
    const initial = instance.method;
    instance.method = 'within';
    await Vue.nextTick();
    const changed = control.getSpatialMethod();
    control.showToggledTool(false);
    return { initial, changed, removed: !document.querySelector('.usermessage-tool') };
  });
  assert.deepEqual(result, { initial: 'intersects', changed: 'within', removed: true });
});

Then('iframe messages publish readiness and command outcomes', async function () {
  const result = await this.corePage.evaluate(async () => {
    const messages = [];
    const { IframeApp } = window.coreTestExports;
    const originalPost = window.postMessage;
    const originalReady = g3w.app.isMapReady;
    const originalGetMap = g3w.app.getMap;
    const originalGetEpsg = g3w.app.getEpsg;
    const originalGetControl = g3w.app.getMapControl;
    const view = new ol.View({ center: [12, 45], projection: 'EPSG:4326', zoom: 3 });
    let capture;
    let reset = false;
    window.postMessage = message => messages.push(message);
    g3w.app.isMapReady = async () => {};
    g3w.app.getMap = () => ({ getView: () => view, getSize: () => [256, 256] });
    g3w.app.getEpsg = () => 'EPSG:4326';
    g3w.app.getMapControl = name => {
      if (name !== 'screenshot') throw new Error(`Unexpected control: ${name}`);
      return {
        overwriteOnClickEvent(callback) { capture = callback; },
        resetOriginalOnClickEvent() { reset = true; },
      };
    };
    g3w.state.plugins = [];
    g3w.state.project.layers = [{ getId: () => 'roads', getName: () => 'Roads' }];
    g3w.state.project.state = { extent: [-180, -90, 180, 90] };
    try {
      const iframe = new IframeApp();
      await coreTestExports.waitFor(() => messages.some(message => message.action === 'app:ready'), 1000);
      window.dispatchEvent(new MessageEvent('message', {
        data: { id: 'ok', action: 'app:zoomtocoordinates', data: { coordinates: [10, 20] } },
      }));
      window.dispatchEvent(new MessageEvent('message', {
        data: { id: 'invalid', action: 'app:zoomtocoordinates', data: { coordinates: [10] } },
      }));
      await coreTestExports.waitFor(() => messages.length === 3, 1000);
      await iframe['app:results']({ capture: false });
      const captureResults = g3w.app.showData.iframe;
      await iframe['app:screenshot']();
      capture('captured-image');
      await iframe['app:screenshot']({ capture: false });
      const center = await iframe['app:getcenter']();
      const transformed = await iframe['app:getcenter']({ epsg: 3857 });
      const extent = await iframe['app:getextent']();
      const projectedExtent = await iframe['app:getextent']({ epsg: 3857 });
      const zoomed = await iframe['app:zoomtoextent']({ extent: [-5, -5, 5, 5] });
      return { messages, captureResults, reset, center, transformed, extent, projectedExtent, zoomed };
    } finally {
      window.postMessage = originalPost;
      g3w.app.isMapReady = originalReady;
      g3w.app.getMap = originalGetMap;
      g3w.app.getEpsg = originalGetEpsg;
      g3w.app.getMapControl = originalGetControl;
    }
  });
  assert.deepEqual(result.messages.map(message => [message.id, message.action, message.response.result]), [
    [null, 'app:ready', true], ['ok', 'app:zoomtocoordinates', true],
    ['invalid', 'app:zoomtocoordinates', false], [null, 'app:screenshot', true],
  ]);
  assert.deepEqual(result.messages[0].response.data.layers, [{ id: 'roads', name: 'Roads' }]);
  assert.deepEqual(result.messages[3].response.data, 'captured-image');
  assert.equal(result.captureResults, false);
  assert.equal(result.reset, true);
  assert.deepEqual(result.center, [10, 20]);
  assert.ok(Math.abs(result.transformed[0] - 1113194.9079327357) < 0.001);
  assert.equal(result.extent.length, 4);
  assert.equal(result.projectedExtent.length, 4);
  assert.deepEqual(result.zoomed, [-5, -5, 5, 5]);
});

Then('iframe feature searches try layers in order with highlight {string}', async function (highlight) {
  const requests = [];
  await this.corePage.route('**/vector/data/**', route => {
    const id = new URL(route.request().url()).pathname.split('/').filter(Boolean).at(-1);
    requests.push({ id, data: route.request().postDataJSON() });
    return route.fulfill({ json: { result: true, vector: { count: id === 'empty' ? 0 : 1, data: {
      type: 'FeatureCollection', features: id === 'empty' ? [] : [{
        type: 'Feature', id: 7, properties: { name: 'Main & Side' },
        geometry: id === 'records' ? null : { type: 'Point', coordinates: [12, 45] },
      }],
    } } } });
  });
  const result = await this.corePage.evaluate(async highlight => {
    const layers = ['empty', 'records', 'roads'].map(id => createFixtureLayer({
      id, name: id, geometrytype: id === 'records' ? 'NoGeometry' : 'Point', crs: { epsg: 'EPSG:3857' },
    }));
    g3w.state.project.state.layerstree = layers.map(layer => ({ id: layer.getId() }));
    const zooms = [];
    const warnings = [];
    const warn = console.warn;
    g3w.app.zoomToFeatures = async (features, options) => zooms.push({
      ids: features.map(feature => feature.getId()), coordinates: features[0].getGeometry().getCoordinates(), ...options,
    });
    console.warn = message => warnings.push(String(message));
    try {
      const id = await coreTestExports.IframeApp.prototype['app:zoomtofeature']({
        qgs_layer_id: ['empty', 'records', 'roads'], feature: { field: 'name', value: ['Main & Side', 'A/B'] }, highlight,
      });
      return { id, zooms, warnings };
    } finally {
      console.warn = warn;
    }
  }, highlight === 'true');
  assert.deepEqual(result, {
    id: 'roads', zooms: [{ ids: [7], coordinates: [12, 45], highlight: highlight === 'true' }],
    warnings: ['invalid response', 'invalid response'],
  });
  assert.deepEqual(requests.map(request => request.id), ['empty', 'records', 'roads']);
  assert.ok(requests.every(request => request.data.field === 'name|eq|Main%20%26%20Side|OR,name|eq|A%2FB'));
});

Then('iframe feature searches fall back after empty and unknown layers', async function () {
  let requests = 0;
  await this.corePage.route('**/vector/data/**', route => {
    requests++;
    return route.fulfill({ json: { result: true, vector: { count: 0, data: { type: 'FeatureCollection', features: [] } } } });
  });
  const result = await this.corePage.evaluate(async () => {
    createFixtureLayer({ id: 'empty' });
    Object.assign(g3w.state.project.state, { layerstree: [{ id: 'empty' }], initextent: [1, 2, 30, 40] });
    const extents = [];
    const warnings = [];
    const warn = console.warn;
    g3w.app.zoomToExtent = extent => extents.push(extent);
    console.warn = message => warnings.push(String(message));
    try {
      const id = await coreTestExports.IframeApp.prototype['app:zoomtofeature']({
        qgs_layer_id: ['empty', 'missing'], feature: { field: 'name', value: 'Absent' },
      });
      return { id, extents, warnings };
    } finally {
      console.warn = warn;
    }
  });
  assert.deepEqual(result, { id: null, extents: [[1, 2, 30, 40]], warnings: ['invalid response', 'invalid response'] });
  assert.equal(requests, 1);
});

Then('application dialogs resolve accepted values and reject cancellation', async function () {
  const result = await this.corePage.evaluate(async () => {
    const accepted = g3w.app.confirm('Apply the change?');
    document.querySelector('dialog button[value="yes"]').click();
    const confirmed = await accepted;
    const declined = g3w.app.confirm('Apply another change?');
    document.querySelector('dialog button[value="no"]').click();
    const rejected = await declined;
    const text = g3w.app.prompt('Layer name', 'Roads');
    let dialog = document.querySelector('dialog');
    let input = dialog.querySelector('input');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const emptyDisabled = dialog.querySelector('button[value="yes"]').disabled;
    input.value = 'Buildings';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    dialog.querySelector('button[value="yes"]').click();
    const value = await text;
    const choices = g3w.app.prompt('Choose a layer', [
      { value: 'roads', label: 'Roads' }, { value: 'buildings', label: 'Buildings' },
    ]);
    dialog = document.querySelector('dialog');
    input = dialog.querySelector('input[value="roads"]');
    input.checked = true;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    dialog.querySelector('button[value="yes"]').click();
    const choice = await choices;
    const cancelled = g3w.app.prompt('Cancelled name', 'Original').then(
      () => false,
      error => error === undefined,
    );
    document.querySelector('dialog button[value="no"]').click();
    const cancelRejected = await cancelled;
    const callbacks = [];
    const custom = g3w.app.dialog({
      title: 'Details', message: '<p>Layer information</p>', className: 'details-dialog',
      buttons: { save: { label: 'Save', callback() { callbacks.push(this.returnValue); } } },
    });
    const title = custom.querySelector('h4').textContent;
    custom.querySelector('button[value="save"]').click();
    await coreTestExports.waitFor(() => !document.querySelector('.details-dialog'), 1000);
    return {
      confirmed, rejected, emptyDisabled, value, choice, cancelRejected,
      callbacks, title, dialogsRemaining: document.querySelectorAll('dialog').length,
    };
  });
  assert.deepEqual(result, {
    confirmed: true, rejected: false, emptyDisabled: true, value: 'Buildings',
    choice: 'roads', cancelRejected: true, callbacks: ['save'], title: 'Details', dialogsRemaining: 0,
  });
});

Then('galleries navigate images and loading indicators are removed', async function () {
  const result = await this.corePage.evaluate(async () => {
    g3w.app.showSpinner({ container: '#fixture', id: 'fixture-spinner', transparent: true, center: true });
    g3w.app.showSpinner({ container: '#fixture', id: 'fixture-spinner' });
    const spinnerCount = document.querySelectorAll('#fixture-spinner').length;
    g3w.app.hideSpinner('fixture-spinner');
    g3w.app.hideSpinner('fixture-spinner');
    const spinnerRemoved = !document.querySelector('#fixture-spinner');
    const image = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/%3E';
    g3w.app.showGallery([{ src: image }, { src: image }], 0);
    const dialog = document.querySelector('.modal-gallery');
    const current = () => Array.from(dialog.querySelectorAll('img')).findIndex(img => !img.hidden);
    const indexes = [current()];
    dialog.querySelector('button[value="next"]').click();
    indexes.push(current());
    dialog.querySelector('button[value="prev"]').click();
    indexes.push(current());
    dialog.querySelector('button[value="prev"]').click();
    indexes.push(current());
    dialog.querySelector('button[value="close"]').click();
    await coreTestExports.waitFor(() => !document.querySelector('.modal-gallery'), 1000);
    g3w.app.hideSidebar();
    const collapsed = document.body.classList.contains('sidebar-collapse');
    g3w.app.toggleSidebar();
    const expanded = document.body.classList.contains('sidebar-open');
    g3w.app.toggleSidebar();
    return {
      spinnerCount, spinnerRemoved, indexes, galleryRemoved: !document.querySelector('.modal-gallery'),
      collapsed, expanded, collapsedAgain: document.body.classList.contains('sidebar-collapse'),
    };
  });
  assert.deepEqual(result, {
    spinnerCount: 1, spinnerRemoved: true, indexes: [0, 1, 0, 1], galleryRemoved: true,
    collapsed: true, expanded: true, collapsedAgain: true,
  });
});
