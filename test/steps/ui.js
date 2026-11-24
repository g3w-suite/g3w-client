const assert = require('node:assert/strict');
const { After, Before, Then, When } = require('@cucumber/cucumber');
const { loadSource } = require('../support/ui-modules');

const globalNames = ['window', 'document', 'HTMLElement', 'customElements', 'MutationObserver', 'Vue', 'ol', 'g3w', 'isMobile', '$', '$script', 'initConfig'];

Before({ tags: '@ui-behaviors' }, function () {
  this.uiGlobals = new Map(globalNames.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
});

After({ tags: '@ui-behaviors' }, function () {
  for (const [name, descriptor] of this.uiGlobals) {
    if (descriptor) {
      Object.defineProperty(globalThis, name, descriptor);
    } else {
      delete globalThis[name];
    }
  }
});

function stateImports(state = {}, gui = {}) {
  return {
    'g3w-state': state,
    'g3w-app': gui,
    'g3w-i18n': { gettext: value => value }
  };
}

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
  };
}

function element() {
  const attributes = new Map();
  const classes = new Set();
  const listeners = {};
  return {
    attributes,
    classes,
    classList: {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      contains: name => classes.has(name),
      toggle(name, force) {
        const enabled = undefined === force ? !classes.has(name) : force;
        enabled ? classes.add(name) : classes.delete(name);
        return enabled;
      }
    },
    style: { setProperty() {}, removeProperty() {} },
    dataset: {},
    innerHTML: '',
    textContent: '',
    isConnected: true,
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    hasAttribute(name) { return attributes.has(name); },
    removeAttribute(name) { attributes.delete(name); },
    toggleAttribute(name, force) { force ? attributes.set(name, '') : attributes.delete(name); },
    addEventListener(name, callback) { (listeners[name] ||= []).push(callback); },
    dispatchEvent(event) { (listeners[event.type] || []).forEach(callback => callback(event)); },
    querySelector() { return element(); },
    querySelectorAll() { return []; },
    closest() { return null; },
    appendChild() {},
    insertAdjacentHTML() {},
    insertAdjacentElement() {},
    showPopover() {},
    hidePopover() {},
    remove() {},
    contains() { return false; },
    getBoundingClientRect() { return { top: 0, left: 0, right: 0, bottom: 0, width: 10, height: 10 }; },
  };
}

async function component(name, imports) {
  return loadSource(`components/${name}`, imports);
}

const componentBehaviors = {
  'field-renderer': async () => {
    const field = await component('G3WField.vue');
    return [field.computed.type.call({ fieldType: 'photo_field', state: { value: null } }), 'image'];
  },
  'tabs-layout': async () => {
    const tabs = await component('G3WTabs.vue');
    const context = {
      fields: [{ name: 'street' }, { name: 'city' }],
      getNodeType: tabs.methods.getNodeType
    };
    return [tabs.methods.getNodeRows.call(context, {
      columncount: 2,
      nodes: [{ field_name: 'street' }, { field_name: 'city' }]
    }), [[{ field_name: 'street', alias: 'street' }, { field_name: 'city', alias: 'city' }]]];
  },
  'change-map-root': async () => {
    const modal = await component('ModalChangeMap.vue');
    const context = { current: 'projects', items: [], steps: [], macrogroups: [{ id: 'm1' }], groups: [{ id: 'g1' }] };
    modal.methods.showRoot.call(context);
    return [{ current: context.current, items: context.items, steps: context.steps }, {
      current: 'root', items: [{ id: 'm1' }, { id: 'g1' }], steps: []
    }];
  },
  'metadata-empty-value': async () => {
    const metadata = await component('ModalMetadata.vue');
    return [metadata.methods.sanitizeValue.call({}, {}), ''];
  },
  'query-expression': async () => {
    const builder = await component('QueryBuilder.vue');
    const context = { filter: '' };
    builder.methods.addToExpression.call(context, { value: 'road name', type: 'field' });
    builder.methods.addToExpression.call(context, { value: '=', type: 'operator' });
    builder.methods.addToExpression.call(context, { value: 'Main St', type: 'value' });
    return [context.filter, '"road name" = \'Main St\''];
  },
  'search-query-builder-panel': async () => {
    const events = [];
    class Panel {
      constructor(options) { this.options = options; }
    }
    const search = await component('Search.vue', {
      'g3w-panel': Panel,
      'g3w-app': { closeContent: () => events.push('content'), closeSideBar: () => events.push('sidebar') },
      'g3w-i18n': { gettext: value => value }
    });
    const panel = search.methods.showQueryBuilderPanel.call({});
    return [{ title: panel.options.title, show: panel.options.show, events }, {
      title: 'Advanced search', show: true, events: ['content', 'sidebar']
    }];
  },
  'search-operator-label': async () => {
    const searchPanel = await component('SearchPanel.vue', {
      'g3w-constants': { FILTER_EXPRESSION_OPERATORS: { eq: '=' } }
    });
    return [searchPanel.methods.getLabelOperator.call({}, 'eq'), '[=]'];
  },
  'bookmark-removal': async () => {
    const storage = memoryStorage({ SPATIALBOOKMARKS: JSON.stringify({ project: [{ id: 'keep' }, { id: 'remove' }] }) });
    globalThis.window = { localStorage: storage };
    const state = { project: { getId: () => 'project' } };
    const bookmarks = await component('SpatialBookMarks.vue', stateImports(state));
    const context = { user_bookmarks: [{ id: 'keep' }, { id: 'remove' }] };
    context.saveUserBookMarks = () => bookmarks.methods.saveUserBookMarks.call(context);
    bookmarks.methods.removeBookMark.call(context, 'remove');
    return [JSON.parse(storage.getItem('SPATIALBOOKMARKS')).project, [{ id: 'keep' }]];
  },
  'table-field-type': async () => {
    const table = await component('Table.vue');
    return [table.methods.getFieldType.call({}, { type: 'text', value: 'https://example.test/map.png' }), 'photo_field'];
  },
  'alerts-navbar-item': async () => {
    let ready;
    const state = { project: { state: { messages: { items: [{ id: 1 }] } } } };
    const gui = {
      on: (name, callback) => { ready = callback; },
      isReady: () => new Promise(() => {})
    };
    globalThis.initConfig = { header_custom_links: [] };
    await loadSource('components/g3w-alerts.js', stateImports(state, gui));
    ready();
    return [globalThis.initConfig.header_custom_links.map(link => [link.id, link.icon]), [['alerts', 'far fa-bell']]];
  },
  'search-service-state': async () => {
    class Emitter {}
    class Panel {
      constructor(options) { this.options = options; }
    }
    const layer = { id: 'roads' };
    const search = await loadSource('components/g3w-search.js', {
      'g3w-constants': { SEARCH_ALLVALUE: '__ALL__', PAGELENGTHS: [10, 20] },
      'g3w-emitter': Emitter,
      'g3w-panel': Panel,
      'g3w-state': {},
      'g3w-app': { _projectLayerIds: ['roads'] },
      'utils/getUniqueDomId': { getUniqueDomId: () => 'input-1' },
      'utils/getCatalogLayerById': { getCatalogLayerById: () => layer },
      'utils/toRawType': { toRawType: value => Object.prototype.toString.call(value).slice(8, -1) },
      'utils/debounce': { debounce: callback => callback },
      'utils/getDataForSearchInput': { getDataForSearchInput: async () => [] },
    });
    const panel = search.SearchPanel({
      name: 'Road search',
      options: {
        querylayerid: 'roads',
        filter: [{
          id: 'type',
          label: 'Road type',
          attribute: 'type',
          op: 'eq',
          input: { type: 'selectfield', options: { values: ['local'] } }
        }]
      }
    });
    await panel.options.service.state.mounted;
    return [{
      title: panel.options.service.state.title,
      layer: panel.options.service.state.search_layers[0].id,
      value: panel.options.service.state.forminputs[0].value,
      values: panel.options.service.state.forminputs[0].values
    }, {
      title: 'Road search',
      layer: 'roads',
      value: '__ALL__',
      values: [{ key: '__ALL__', value: '__ALL__' }, { key: 'local', value: 'local' }]
    }];
  },
  'x-option-accessibility': async () => {
    class FakeHTMLElement {
      constructor() { this.attributes = new Map(); this.textContent = 'Road'; this.id = ''; }
      setAttribute(name, value) { this.attributes.set(name, String(value)); }
      getAttribute(name) { return this.attributes.get(name) ?? null; }
      hasAttribute(name) { return this.attributes.has(name); }
      toggleAttribute(name, force) { force ? this.attributes.set(name, '') : this.attributes.delete(name); }
    }
    const definitions = new Map();
    globalThis.HTMLElement = FakeHTMLElement;
    globalThis.customElements = { define: (name, constructor) => definitions.set(name, constructor) };
    globalThis.document = { head: { insertAdjacentHTML() {} } };
    await loadSource('components/x-select.js');
    const option = new (definitions.get('x-option'))();
    option.setAttribute('selected', '');
    option.connectedCallback();
    return [{
      role: option.getAttribute('role'),
      selected: option.getAttribute('aria-selected'),
      value: option.value,
      generatedId: option.id.startsWith('x-option-')
    }, { role: 'option', selected: 'true', value: 'Road', generatedId: true }];
  },
};

const directiveBehaviors = {
  'disabled-class': async () => {
    const directive = await loadSource('directives/v-disabled.js');
    const el = element();
    directive(el, { value: true });
    return [el.classList.contains('g3w-disabled'), true];
  },
  'translated-prefix': async () => {
    const listeners = [];
    const directive = await loadSource('directives/v-t.js', {
      'g3w-app': { on: (name, callback) => listeners.push([name, callback]) },
      'g3w-i18n': { gettext: value => `translated:${value}` }
    });
    const el = element();
    el.innerHTML = 'Before';
    directive.bind(el, { name: 't', arg: 'pre', value: 'Save' });
    return [{ text: el.innerHTML, event: listeners[0][0] }, { text: 'translated:Save Before', event: 'i18n-ready' }];
  },
  'tooltip-title-attributes': async () => {
    const root = element();
    const doc = {
      head: { insertAdjacentHTML() {} },
      body: element(),
      createElement: () => Object.assign(element(), { content: { firstChild: element() } }),
      querySelector: () => root,
      addEventListener() {},
      on() {},
    };
    globalThis.document = doc;
    globalThis.$ = () => ({ on() {} });
    const tooltip = await loadSource('directives/v-t-tooltip.js', {
      'g3w-app': { isMobile: () => false },
      'g3w-i18n': { gettext: value => value }
    });
    const el = element();
    tooltip(el, { arg: 'bottom', value: 'Help', modifiers: { text: true } });
    return [{ title: el.getAttribute('data-i18n-title'), placement: el.getAttribute('data-placement'), raw: el.hasAttribute('data-i18n-raw') }, {
      title: 'Help', placement: 'bottom', raw: true
    }];
  },
  'select2-multiple-selection': async () => {
    let changeHandler;
    const events = [];
    const el = { dispatchEvent: event => events.push(event.type) };
    globalThis.$ = () => ({
      select2() { return this; },
      off() { return this; },
      on(_name, callback) { changeHandler = callback; return this; }
    });
    const directive = await loadSource('directives/v-select2.js', { 'g3w-app': { on() {} } });
    const context = { selected: ['one'] };
    directive.inserted(el, { value: 'selected' }, { data: { attrs: { multiple: true } }, context });
    changeHandler({ type: 'select2:select', params: { data: { id: 'two' } } });
    return [{ selected: context.selected, events }, { selected: ['one', 'two'], events: ['change'] }];
  }
};

function pointerClass() {
  return class Pointer {
    constructor(options = {}) {
      Object.assign(this, options);
      this.events = [];
      this.map = null;
    }
    dispatchEvent(event) { this.events.push(event); }
    setActive(active) { this.active = active; }
    setMap(map) { this.map = map; }
    getMap() { return this.map; }
  };
}

const interactionBehaviors = {
  'pick-coordinate-event': async () => {
    globalThis.ol = { interaction: { Pointer: pointerClass() } };
    const PickCoordinates = await loadSource('interactions/pick-coordinates.js');
    const interaction = new PickCoordinates();
    interaction.handleUpEvent({ coordinate: [12, 34] });
    return [interaction.events[0], { type: 'picked', coordinate: [12, 34] }];
  },
  'pick-filtered-feature': async () => {
    globalThis.isMobile = { any: false };
    globalThis.ol = { interaction: { Pointer: pointerClass() } };
    const PickFeature = await loadSource('interactions/pick-feature.js');
    const feature = { id: 'f1' };
    const layer = { id: 'roads' };
    const map = {
      forEachFeatureAtPixel(_pixel, callback, options) {
        if (options.layerFilter(layer)) return callback(feature, layer);
      }
    };
    const interaction = new PickFeature({ layers: [layer], features: [feature] });
    interaction.handleDownEvent({ pixel: [1, 2], map });
    interaction.handleUpEvent({ coordinate: [3, 4] });
    const event = interaction.events[0];
    return [{ type: event.type, feature: event.feature, layer: event.layer, coordinate: event.coordinate }, {
      type: 'picked', feature, layer, coordinate: [3, 4]
    }];
  }
};

function controlEnvironment({ mobile = false, mapcontrols = {}, existing = {} } = {}) {
  const records = [];
  const listeners = {};
  const mapControls = new Map(Object.entries(existing));
  const featureSource = () => ({
    features: [],
    addFeatures(features) { this.features.push(...features); },
    addFeature(feature) { this.features.push(feature); },
    getFeatures() { return this.features; },
    getFeatureById(id) { return this.features.find(feature => feature.getId?.() === id); },
    clear() { this.features = []; },
    on(name, callback) { (this.listeners ||= {})[name] = callback; },
  });
  class Control {
    constructor(options = {}) {
      Object.assign(this, options);
      this.options = options;
      this.element = options.element || element();
      this.listeners = {};
      this.handleDragEvent = () => {};
    }
    on(name, callback) { (this.listeners[name] ||= []).push(callback); return { name, callback }; }
    addType(type) { (this.types ||= []).push(type); }
    getSource() { return this.source ||= featureSource(); }
    getFeatures() { return this.features ||= []; }
    setVisible(value) { this.visible = value; }
    getVisible() { return this.visible !== false; }
    isVisible() { return this.visible !== false; }
    setZIndex(value) { this.zIndex = value; }
    getZIndex() { return this.zIndex || 0; }
    setTracking(value) { this.tracking = value; }
    getTracking() { return !!this.tracking; }
    setProjection(value) { this.projection = value; }
    getPosition() { return null; }
    setCoordinateFormat(value) { this.coordinateFormat = value; }
    get(name) { return this[name]; }
    getMap() { return this.map; }
    setMap(map) { this.map = map; }
    getInteraction() { return this.interaction ||= new Control(); }
    setEventKey() {}
    dispatchEvent(event) { (this.listeners[event.type] || []).forEach(callback => callback(event)); }
  }
  class VectorLayer extends Control {
    constructor(options = {}) { super(options); this.source = options.source || featureSource(); }
  }
  class VectorSource extends Control {
    constructor(options = {}) { super(options); this.features = options.features || []; }
    addFeatures(features) { this.features.push(...features); }
    addFeature(feature) { this.features.push(feature); }
    getFeatures() { return this.features; }
    getFeatureById(id) { return this.features.find(feature => feature.getId?.() === id); }
    clear() { this.features = []; }
  }
  class GeoJSON {
    readFeatures(collection) { return collection.features || []; }
    writeFeatures() { return '{"type":"FeatureCollection","features":[]}'; }
    writeFeaturesObject() { return { type: 'FeatureCollection', features: [] }; }
  }
  const ol = {
    control: new Proxy({}, { get: () => Control }),
    layer: { Vector: VectorLayer },
    source: { Vector: VectorSource },
    style: new Proxy({}, { get: () => Control }),
    geom: new Proxy({}, { get: () => Control }),
    interaction: new Proxy({ Pointer: Control }, { get: (target, key) => target[key] || Control }),
    format: { GeoJSON },
    coordinate: {
      createStringXY: () => coords => coords.join(','),
      format: (coords, template) => template.replace('{x}', coords[0]).replace('{y}', coords[1])
    },
    proj: { transform: coords => coords, transformExtent: extent => extent },
    extent: { boundingExtent: points => points },
    sphere: { getLength: () => 1 },
    Overlay: Control,
    Feature: Control,
    Geolocation: Control,
    View: Control,
    Observable: { unByKey() {} },
  };
  const map = {
    addControl(control) { records.push({ type: 'map-control', control }); },
    addLayer(layer) { records.push({ type: 'map-layer', layer }); },
    removeLayer() {},
    addInteraction() {},
    removeInteraction() {},
    getView: () => ({
      on() {},
      getCenter: () => [0, 0],
      getResolution: () => 1,
      getProjection: () => ({ getUnits: () => 'm' }),
      calculateExtent: () => [0, 0, 1, 1],
      fit() {},
      animate() {},
      setCenter() {},
    }),
    getSize: () => [100, 100],
    on() {},
    getTargetElement: () => element(),
    getViewport: () => element(),
    forEachFeatureAtPixel: () => null,
  };
  const state = {
    project: {
      state: { id: 'project', extent: [0, 0, 1, 1], baselayers: [], annotations: {}, print: [] },
      getId: () => 'project',
      getGid: () => 'project',
      getLayers: () => [],
      getPrint: () => [],
    },
    vendorkeys: {},
    language: 'en',
  };
  const gui = {
    setupControl: {},
    project: { state: { extent: [0, 0, 1, 1] } },
    config: {},
    on(name, callback) { (listeners[name] ||= []).push(callback); },
    onafter() {},
    onbefore() {},
    isMapReady: () => Promise.resolve(),
    addControl(id, control, ...args) {
      records.push({ type: 'add', id, control, args });
      mapControls.set(id, control);
      return control;
    },
    createMapControl(options) {
      records.push({ type: 'create', options });
      const control = new Control(options.options);
      mapControls.set(options.id, control);
      return control;
    },
    getMapControl: id => mapControls.get(id),
    getMap: () => map,
    getMapLayers: () => [],
    getBaseLayers: () => [],
    getEpsg: () => 'EPSG:3857',
    getCrs: () => 'EPSG:3857',
    getProjection: () => ({ getUnits: () => 'm' }),
    getResourcesUrl: () => '/resources/',
    getCurrentContent: () => null,
    getComponent: () => null,
    addComponent: () => ({ onbefore() {} }),
    registerVectorLayer() {},
    showAddLayerModal() { records.push({ type: 'show-add-layer' }); },
    closeSideBar() {},
    closeContent() {},
    closeUserMessage() {},
    showUserMessage() {},
    showMarker() {},
    getLocalStorage: () => ({ data: [] }),
    getMapUnits: () => 'meters',
  };
  const document = {
    body: Object.assign(element(), { style: {} }),
    head: { insertAdjacentHTML() {}, appendChild() {} },
    createElement(tag) {
      const result = element();
      if ('template' === tag) result.content = { firstChild: element() };
      return result;
    },
    querySelector: () => element(),
    querySelectorAll: () => [],
    addEventListener() {},
    elementFromPoint: () => element(),
  };
  const fakeVue = {
    observable: value => value,
    watch(_getter, callback, options) { if (options?.immediate) callback(null); },
    extend: () => class {},
  };
  globalThis.ol = ol;
  globalThis.document = document;
  globalThis.window = {
    initConfig: {
      mapcontrols,
      user: { is_staff: false },
      projects: [],
      urls: { baseurl: '/', config: '/config', clienturl: '/' },
      staticurl: '/',
      overviewproject: null,
    },
    localStorage: memoryStorage(),
    innerWidth: 1024,
    innerHeight: 768,
  };
  globalThis.initConfig = globalThis.window.initConfig;
  globalThis.isMobile = { any: mobile };
  globalThis.Vue = fakeVue;
  globalThis.$ = () => ({ on() {}, tooltip() {}, data() { return { tip: () => [element()] }; } });
  globalThis.$script = () => {};
  globalThis.g3w = {
    app: gui,
    state,
    idb: { getItem: async () => null, setItem: async () => {} },
    Control,
    Component: Control,
    constants: { PRINT_SCALES: [], G3W_FID: 'id', PAGELENGTHS: [] },
    gettext: value => value,
    utils: new Proxy({
      throttle: callback => callback,
      debounce: callback => callback,
      getUniqueDomId: () => 'control-id',
      createMeasureTooltip: () => ({}),
      XHR: { get: async () => ({}) },
      PickCoordinatesInteraction: Control,
      normalizeEpsg: value => value,
      getResolutionFromScale: () => 1,
      getScaleFromResolution: () => 1,
    }, { get: (target, key) => target[key] ?? (() => undefined) })
  };
  return { app: gui, map, mapControls, records, listeners, state, ol };
}

async function loadControl(file, options) {
  return { ...controlEnvironment(options), module: await loadSource(`static/map-controls/${file}`) };
}

const controlBehaviors = {
  'add-layer-control': async () => {
    const env = await loadControl('addlayer.js');
    env.app.setupControl.addlayer();
    const call = env.records.find(record => record.type === 'create');
    const button = element();
    env.records.length = 0;
    call.options.options.onSetMap.call({ element: { querySelector: () => button } }, { setter: 'after' });
    button.dispatchEvent({ type: 'click' });
    return [{ id: call.options.id, click: env.records.some(record => record.type === 'show-add-layer') }, {
      id: 'addlayer', click: true
    }];
  },
  'annotation-control-load': async () => {
    const env = await loadControl('annotation.js');
    await env.app.setupControl.annotation();
    return [env.records.filter(record => record.type === 'add').map(record => record.id), ['annotation']];
  },
  'attribution-assignment': async () => {
    const env = controlEnvironment();
    const attributions = [];
    env.app.config = { header_terms_of_use_text: 'Terms', header_terms_of_use_link: '' };
    env.app.getMapLayers = () => [{ getOLLayer: () => ({ getSource: () => ({ setAttributions: value => attributions.push(value) }) }) }];
    await loadSource('static/map-controls/attribution.js');
    await Promise.resolve();
    return [attributions, ['<span class = "skin-color" style = "font-weight: bold">Terms</span>']];
  },
  'baselayer-empty-project': async () => {
    const env = await loadControl('baselayer.js');
    env.listeners['after:setupControls'][0]();
    return [env.records.length, 0];
  },
  'geocoding-control-load': async () => {
    const env = await loadControl('geocoding.js');
    env.app.setupControl.geocoding();
    return [env.records.filter(record => record.type === 'add').map(record => record.id), ['geocoding']];
  },
  'geolocation-control-load': async () => {
    const env = await loadControl('geolocation.js');
    env.app.setupControl.geolocation();
    return [env.records.filter(record => record.type === 'add').map(record => record.id), ['geolocation']];
  },
  'measure-add-type': async () => {
    const existing = { types: [], addType(type) { this.types.push(type); } };
    const env = await loadControl('measure.js', { mapcontrols: { length: true }, existing: { measure: existing } });
    env.app.setupControl.length();
    return [existing.types, ['length']];
  },
  'mouse-position-format': async () => {
    const env = await loadControl('mouseposition.js');
    env.app.setupControl.mouseposition();
    const record = env.records.find(item => item.type === 'add');
    return [{ id: record.id, offline: record.control.offline, display: record.control.coordinateFormat([1, 2]) }, {
      id: 'mouseposition', offline: true, display: '\u00a0X: 1, Y: 2\u00a0\u00a0 [EPSG:3857]\u00a0'
    }];
  },
  'overview-mobile-omission': async () => {
    const env = await loadControl('overview.js', { mobile: true });
    await env.app.setupControl.overview();
    return [env.records.length, 0];
  },
  'query-coordinate-event': async () => {
    const env = await loadControl('query.js');
    env.app.setupControl.query();
    const config = env.records.find(record => record.type === 'create').options;
    const emitted = [];
    const interactionListeners = {};
    const context = {
      name: 'query',
      on(name, callback) { (this.listeners ||= {})[name] = callback; return callback; },
      setEventKey() {},
      getInteraction: () => ({ on(name, callback) { interactionListeners[name] = callback; } }),
      dispatchEvent: event => emitted.push(event),
    };
    config.options.onSetMap.call(context, { map: env.map, setter: 'after' });
    interactionListeners.picked({ coordinate: [5, 6] });
    return [emitted, [{ type: 'picked', coordinates: [5, 6] }]];
  },
  'query-by-add-type': async () => {
    const existing = { types: [], addType(type) { this.types.push(type); } };
    const env = await loadControl('queryby.js', { existing: { queryby: existing } });
    env.app.setupControl.querybbox('querybbox');
    return [existing.types, ['querybbox']];
  },
  'scale-control-load': async () => {
    const env = await loadControl('scale.js');
    env.app.setupControl.scale();
    const record = env.records.find(item => item.type === 'add');
    return [{ id: record.id, offline: record.control.offline, target: record.control.target }, {
      id: 'scale', offline: true, target: 'scale-control'
    }];
  },
  'scale-line-load': async () => {
    const env = await loadControl('scaleline.js');
    env.app.setupControl.scaleline();
    return [env.records.find(item => item.type === 'create').options.id, 'scaleline'];
  },
  'screenshot-control-load': async () => {
    const env = await loadControl('screenshot.js');
    env.app.setupControl.screenshot();
    return [{
      id: env.records.find(item => item.type === 'add').id,
      printLayouts: env.state.project.state.print.map(item => item.name)
    }, { id: 'screenshot', printLayouts: ['__G3W_SCREENSHOT__'] }];
  },
  'streetview-control-load': async () => {
    const env = await loadControl('streetview.js');
    env.app.setupControl.streetview();
    return [env.records.filter(record => record.type === 'add').map(record => record.id), ['streetview']];
  },
  'toggler-control-click': async () => {
    const env = await loadControl('toggler.js');
    const config = env.records.find(record => record.type === 'create').options;
    config.options.onclick();
    return [env.mapControls.get('toggler').element.classList.contains('ungroup'), true];
  },
  'zoom-control-load': async () => {
    const env = await loadControl('zoom.js');
    env.app.setupControl.zoom();
    return [env.records.find(record => record.type === 'create').options.id, 'zoom'];
  },
  'zoom-box-control-load': async () => {
    const env = await loadControl('zoombox.js');
    env.app.setupControl.zoombox();
    return [env.records.find(record => record.type === 'create').options.id, 'zoombox'];
  },
  'zoom-history-control-load': async () => {
    const env = await loadControl('zoomhistory.js');
    env.app.setupControl.zoomhistory();
    return [env.records.find(record => record.type === 'create').options.id, 'zoomhistory'];
  },
  'zoom-to-extent-load': async () => {
    const env = await loadControl('zoomtoextent.js');
    env.app.setupControl.zoomtoextent();
    return [env.records.find(record => record.type === 'create').options.id, 'zoomtoextent'];
  }
};

const behaviors = { ...componentBehaviors, ...directiveBehaviors, ...interactionBehaviors, ...controlBehaviors };

When('I exercise UI behavior {string}', async function (name) {
  assert.ok(behaviors[name], `unknown UI behavior: ${name}`);
  [this.uiActual, this.uiExpected] = await behaviors[name]();
});

Then('the observed UI effect matches the expected result', function () {
  assert.deepEqual(this.uiActual, this.uiExpected);
});
