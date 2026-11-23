const assert = require('node:assert/strict');
const fs = require('node:fs');
const { After, Before, Then, When } = require('@cucumber/cucumber');
const { strToU8, zipSync } = require('fflate');
const {
  closeUtilityBrowser, createDialogFixture, getOl, importVectorLayerInBrowser, loadUtility,
  resetUtilityEnvironment,
} = require('../support/utility-modules');

When('I flatten nested profile data', async function () {
  const { flattenObject } = await loadUtility('flattenObject.js');
  this.result = flattenObject({
    user: {
      name: 'Ada',
      location: { city: 'Rome' }
    },
    roles: ['editor', 'admin']
  }, '/');
});

Then('nested property paths are preserved', function () {
  assert.deepEqual(this.result, {
    'user/name': 'Ada',
    'user/location/city': 'Rome',
    'roles/0': 'editor',
    'roles/1': 'admin'
  });
});

When('I group map layers by geometry type', async function () {
  const { groupBy } = await loadUtility('groupBy.js');
  this.result = groupBy([
    { id: 'roads', geometry: 'LineString' },
    { id: 'buildings', geometry: 'Polygon' },
    { id: 'paths', geometry: 'LineString' }
  ], layer => layer.geometry);
});

Then('layers with the same geometry type are grouped together', function () {
  assert.deepEqual(this.result, {
    LineString: [
      { id: 'roads', geometry: 'LineString' },
      { id: 'paths', geometry: 'LineString' }
    ],
    Polygon: [{ id: 'buildings', geometry: 'Polygon' }]
  });
});

const utilityGlobals = [
  'ol', 'document', 'window', 'location', 'jsts', 'Vue', 'GUI', '__utilityState', '__utilityGui', 'fetch',
];

Before({ tags: '@utility-behaviors' }, async function () {
  this.utilityGlobalDescriptors = new Map(utilityGlobals.map(name => [
    name,
    Object.getOwnPropertyDescriptor(globalThis, name),
  ]));
  this.utilityUrlDescriptors = new Map(['createObjectURL', 'revokeObjectURL'].map(name => [
    name,
    Object.getOwnPropertyDescriptor(URL, name),
  ]));
  this.state = resetUtilityEnvironment();
  this.ol = await getOl();
  globalThis.ol = {
    geom: {
      Point: this.ol.Point,
      MultiPoint: this.ol.MultiPoint,
      LineString: this.ol.LineString,
      MultiLineString: this.ol.MultiLineString,
      LinearRing: this.ol.LinearRing,
      Polygon: this.ol.Polygon,
      MultiPolygon: this.ol.MultiPolygon,
      Circle: this.ol.Circle,
    },
    Feature: this.ol.Feature,
    format: {
      GeoJSON: this.ol.GeoJSON,
      GPX: this.ol.GPX,
      KML: this.ol.KML,
      WMSGetFeatureInfo: this.ol.WMSGetFeatureInfo,
      WKT: this.ol.WKT,
    },
    layer: { Vector: this.ol.VectorLayer },
    source: { Vector: this.ol.VectorSource },
    sphere: {
      getArea: geometry => geometry.getArea(),
      getLength: geometry => geometry.getLength(),
    },
    Observable: { unByKey: this.ol.unByKey },
    Overlay: class {
      constructor(options) {
        this.options = options;
        this.map = null;
      }
      setPosition(position) { this.position = position; }
      getMap() { return this.map; }
    },
  };
  this.calls = [];
  const elements = [];
  globalThis.document = {
    body: {
      appendChild(element) {
        elements.push(element);
        element.parentNode = this;
      },
      removeChild(element) {
        const index = elements.indexOf(element);
        if (index >= 0) elements.splice(index, 1);
        element.parentNode = null;
      },
    },
    createElement(tag) {
      if ('template' === tag) {
        return {
          set innerHTML(value) {
            this.content = { firstChild: createDialogFixture(value) };
            document.lastDialog = this.content.firstChild;
          },
        };
      }
      const element = {
        tagName: tag.toUpperCase(),
        style: {},
        value: '',
        className: '',
        select() { element.selected = true; },
        click() { this.clicked = true; },
        remove() { this.removed = true; },
      };
      elements.push(element);
      this.lastElement = element;
      return element;
    },
    execCommand(command) { this.calls.push(command); return true; },
    calls: [],
    get elements() { return elements; },
  };
  this.state.project = {
    getLayerById: () => null,
    getLayers: () => [],
    getRelationById: () => null,
  };
});

After({ tags: '@utility-behaviors' }, async function () {
  for (const [name, descriptor] of this.utilityGlobalDescriptors) {
    if (descriptor) {
      Object.defineProperty(globalThis, name, descriptor);
    } else {
      delete globalThis[name];
    }
  }
  for (const [name, descriptor] of this.utilityUrlDescriptors) {
    if (descriptor) {
      Object.defineProperty(URL, name, descriptor);
    } else {
      delete URL[name];
    }
  }
  await closeUtilityBrowser();
});

When('I exercise core value utilities', async function () {
  const [
    { addZValue },
    { base },
    { cloneDeep },
    { colorFromHsv },
    { colorToHsv },
    { convertQGISDateTimeFormatToMoment },
    { deprecate },
    { distance },
    { getAlphanumericProps },
    { inherit },
    { normalizeEpsg },
    { noop },
    { sanitizeFidFeature },
    { sameOrigin },
    { toRawType },
  ] = await Promise.all([
    'addZValue.js', 'base.js', 'cloneDeep.js', 'colorFromHsv.js', 'colorToHsv.js',
    'convertQGISDateTimeFormatToMoment.js', 'deprecate.js', 'distance.js',
    'getAlphanumericProps.js', 'inherit.js', 'normalizeEpsg.js', 'noop.js',
    'sanitizeFidFeature.js', 'sameOrigin.js', 'toRawType.js',
  ].map(loadUtility));

  const point = new this.ol.Feature({ geometry: new this.ol.Point([2, 3]) });
  addZValue({ feature: point, geometryType: 'PointZ' });
  const original = { nested: { value: 1 } };
  original.self = original;
  const shared = original.nested;
  original.also = shared;
  const mapValue = new Map([['shared', shared]]);
  mapValue.set(shared, mapValue);
  const setValue = new Set([shared]);
  setValue.add(setValue);
  original.map = mapValue;
  original.set = setValue;
  const cloned = cloneDeep(original);
  const red = colorFromHsv(360, 1, 1, 0.5);
  const parent = function Parent(value) { this.parentValue = value; };
  function Child(value) { base(this, value); }
  const deprecatedWarn = console.warn;
  const deprecatedTrace = console.trace;
  console.warn = () => {};
  console.trace = () => {};
  let instance;
  try {
    inherit(Child, parent);
    Child.prototype.describe = function () { return 'child'; };
    instance = new Child(7);
  } finally {
    console.warn = deprecatedWarn;
    console.trace = deprecatedTrace;
  }
  const wrappedCalls = [];
  const wrapped = deprecate(function (value) {
    wrappedCalls.push([this.marker, value]);
    return value * 2;
  }, 'deprecated fixture');
  const warnings = [];
  const warn = console.warn;
  console.warn = message => warnings.push(message);
  try {
    this.core = {
      coordinates: point.getGeometry().getCoordinates(),
      clone: cloned,
      cloneIndependent: cloned !== original && cloned.nested !== shared && cloned.nested === cloned.also && cloned.self === cloned,
      cloneCollections: cloned.map !== mapValue && cloned.map.get('shared') === cloned.nested &&
        cloned.map.get(cloned.nested) === cloned.map && cloned.set !== setValue &&
        cloned.set.has(cloned.nested) && cloned.set.has(cloned.set),
      color: red,
      hsv: colorToHsv(red),
      date: convertQGISDateTimeFormatToMoment('yyyy-MM-dd'),
      distance: distance([0, 0], [3, 4]),
      props: getAlphanumericProps({ name: 'A', geometry: {}, geom: {} }),
      normalized: [normalizeEpsg(4326), normalizeEpsg('EPSG:3857'), normalizeEpsg({ epsg: 4326 }, false)],
      fid: [sanitizeFidFeature('layer.17'), sanitizeFidFeature('17')],
      sameOrigin: [sameOrigin('https://example.test/a', 'https://example.test/b'), sameOrigin('https://example.test', 'http://example.test')],
      rawTypes: [toRawType(null), toRawType([]), toRawType(new Date(0))],
      noop: noop(),
      inherited: [instance.parentValue, instance.describe()],
      wrapped: [wrapped.call({ marker: 'receiver' }, 4), wrapped.call({ marker: 'other' }, 5), wrappedCalls, warnings],
    };
  } finally {
    console.warn = warn;
  }
});

Then('their values and inheritance behavior are preserved', function () {
  assert.deepEqual(this.core.coordinates, [2, 3, 0]);
  assert.equal(this.core.cloneIndependent, true);
  assert.equal(this.core.cloneCollections, true);
  assert.deepEqual(this.core.clone.nested, { value: 1 });
  assert.deepEqual(this.core.color, { hex: '#ff0000', rgba: { r: 255, g: 0, b: 0, a: 0.5 }, a: 0.5 });
  assert.deepEqual(this.core.hsv, { hue: 0, saturation: 1, brightness: 1 });
  assert.equal(this.core.date, 'YYYY-MM-DD');
  assert.equal(this.core.distance, 5);
  assert.deepEqual(this.core.props, ['name']);
  assert.equal(this.core.normalized[0], 'EPSG:4326');
  assert.equal(this.core.normalized[1], 'EPSG:3857');
  assert.deepEqual(this.core.normalized[2], { epsg: 'EPSG:4326' });
  assert.deepEqual(this.core.fid, ['17', '17']);
  assert.deepEqual(this.core.sameOrigin, [true, false]);
  assert.deepEqual(this.core.rawTypes, ['Null', 'Array', 'Date']);
  assert.equal(this.core.noop, undefined);
  assert.deepEqual(this.core.inherited, [7, 'child']);
  assert.deepEqual(this.core.wrapped, [
    8, 10, [['receiver', 4], ['other', 5]], ['deprecated fixture']
  ]);
});

When('I exercise geometry utilities', async function () {
  const modules = await Promise.all([
    'convertSingleMultiGeometry.js', 'dissolve.js', 'intersects.js', 'is3DGeometry.js',
    'isLineGeometryType.js', 'isMultiGeometry.js', 'isPointGeometryType.js',
    'isPolygonGeometryType.js', 'removeZValue.js', 'splitFeature.js', 'within.js',
  ].map(loadUtility));
  const [{ convertSingleMultiGeometry }, { dissolve }, { intersects }, { is3DGeometry },
    { isLineGeometryType }, { isMultiGeometry }, { isPointGeometryType },
    { isPolygonGeometryType }, { removeZValue }, { splitFeature }, { within }] = modules;
  const point = new this.ol.Point([4, 5]);
  const multiPoint = convertSingleMultiGeometry(point, 'MultiPoint');
  const singlePoint = convertSingleMultiGeometry(multiPoint, 'Point');
  const line = new this.ol.LineString([[0, 0, 8], [3, 4, 9]]);
  const feature = new this.ol.Feature({ geometry: line });
  removeZValue({ feature });
  const polygon = new this.ol.Polygon([[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]);
  const inside = new this.ol.Point([5, 5]);
  const outside = new this.ol.Point([15, 5]);
  const oneFeature = new this.ol.Feature({ geometry: polygon });
  this.geometry = {
    multiPoint: multiPoint.getCoordinates(),
    singlePoint: singlePoint.map(geometry => geometry.getCoordinates()),
    line: line.getCoordinates(),
    contains: within(polygon, inside),
    intersects: intersects(polygon, inside),
    disjoint: intersects(polygon, outside),
    emptyDissolve: dissolve(),
    oneDissolve: dissolve({ features: [oneFeature] }) === oneFeature,
    rejectedSplit: splitFeature({
      feature: oneFeature,
      splitfeature: new this.ol.Feature({ geometry: inside }),
    }),
    types: [
      is3DGeometry('PointZM'),
      isLineGeometryType('MultiLineString'),
      isMultiGeometry('MultiPolygon'),
      isPointGeometryType('MultiPoint'),
      isPolygonGeometryType('Polygon'),
      is3DGeometry('GeometryCollection'),
    ],
  };
});

Then('the geometry results preserve their expected coordinates and types', function () {
  assert.deepEqual(this.geometry.multiPoint, [[4, 5]]);
  assert.deepEqual(this.geometry.singlePoint, [[4, 5]]);
  assert.deepEqual(this.geometry.line, [[0, 0], [3, 4]]);
  assert.equal(this.geometry.contains, true);
  assert.equal(this.geometry.intersects, true);
  assert.equal(this.geometry.disjoint, false);
  assert.equal(this.geometry.emptyDissolve, null);
  assert.equal(this.geometry.oneDissolve, true);
  assert.deepEqual(this.geometry.rejectedSplit, []);
  assert.deepEqual(this.geometry.types, ['PointZM', true, true, true, true, undefined]);
});

When('I exercise project and search utilities', async function () {
  const [
    { createFilterFromString },
    { createRelationsUrl },
    { getCatalogLayerById },
    { getCatalogLayers },
    { getDataForSearchInput },
    { getListableProjects },
    { getProjectUrl },
    { getRelationLayerById },
    { getResolutionFromScale },
    { getScaleFromResolution },
  ] = await Promise.all([
    'createFilterFromString.js', 'createRelationsUrl.js', 'getCatalogLayerById.js',
    'getCatalogLayers.js', 'getDataForSearchInput.js', 'getListableProjects.js',
    'getProjectUrl.js', 'getRelationLayerById.js', 'getResolutionFromScale.js',
    'getScaleFromResolution.js',
  ].map(loadUtility));
  const parent = { id: 'parent', getUrl: type => `/layers/parent/${type}` };
  const child = { id: 'child', getUrl: type => `/layers/child/${type}` };
  const layers = [parent, child];
  this.state.project = {
    getLayerById(id) { return layers.find(layer => layer.id === id) || null; },
    getLayers: (filter, options) => {
      this.layerQuery = [filter, options];
      return layers;
    },
    getRelationById: id => id === 'rel' ? { referencedLayer: 'parent' } : null,
    getId: () => 'current',
  };
  globalThis.window.initConfig = {
    projects: [
      { gid: 'current', id: 'current', title: 'Current' },
      { gid: 'overview', id: 'overview', title: 'Overview' },
      { gid: 'b', id: 'b', title: 'Beta' },
      { gid: 'a', id: 'a', title: 'Alpha', url: 'workspace' },
      { gid: 'hidden', id: 'hidden', title: 'Hidden', listable: false },
    ],
    overviewproject: 'overview',
    urls: { baseurl: 'https://example.test/' },
  };
  const searchState = {
    layerid: 'parent',
    otherquerylayerids: ['other-1', 'other-2'],
    forminputs: [
      { attribute: 'country', value: ['Rome', 'Milan'], operator: 'in', logicop: 'AND' },
      { attribute: 'region', dependance: 'country' },
      { attribute: 'city', dependance: 'region' },
    ],
  };
  parent.getFilterData = async options => {
    this.searchOptions = options;
    return { data: [['Rome', 1], ['Milan', 2]] };
  };
  this.project = {
    filter: createFilterFromString({ filter: 'age >= 18' }),
    relationUrl: createRelationsUrl({
      layerId: 'parent',
      relation: { id: 'rel', referencedLayer: 'parent', referencingLayer: 'child' },
      fid: 'layer.17',
    }),
    byId: getCatalogLayerById('parent') === parent,
    missing: getCatalogLayerById('missing'),
    catalog: getCatalogLayers('visible', { limit: 2 }),
    relationLayer: getRelationLayerById('rel') === parent,
    projects: getListableProjects().map(project => project.title),
    projectUrl: getProjectUrl('a'),
    scale: getScaleFromResolution(getResolutionFromScale(10000)),
    directFilter: getDataForSearchInput.field({ state: searchState, field: 'city' }),
    search: await getDataForSearchInput({ state: searchState, field: 'city' }),
  };
});

Then('configured layers projects and search values are returned', function () {
  assert.equal(this.project.filter, 'age|gte|18');
  assert.equal(this.project.relationUrl, '/layers/child/data?relationonetomany=rel|17');
  assert.equal(this.project.byId, true);
  assert.equal(this.project.missing, null);
  assert.deepEqual(this.project.catalog, [this.state.project.getLayerById('parent'), this.state.project.getLayerById('child')]);
  assert.deepEqual(this.layerQuery, ['visible', { limit: 2 }]);
  assert.equal(this.project.relationLayer, true);
  assert.deepEqual(this.project.projects, ['Alpha', 'Beta']);
  assert.equal(this.project.projectUrl, 'https://example.test/workspace');
  assert.ok(Math.abs(this.project.scale - 10000) < 1);
  assert.equal(this.project.directFilter, 'country|in|(Rome,Milan)');
  assert.deepEqual(this.project.search, [{ key: 1, value: 'Rome' }, { key: 2, value: 'Milan' }]);
  assert.equal(this.searchOptions.otherquerylayerids, 'other-1,other-2');
  assert.equal(this.searchOptions.field, 'country|in|(Rome,Milan)');
});

When('I exercise browser utilities', async function () {
  const [
    { copyUrl },
    { createMeasureTooltip, get_formatted_angle, get_formatted_area, get_formatted_length, get_formatted_radius },
    { createVectorLayerFromFile },
    { getUniqueDomId },
    { saveBlob },
  ] = await Promise.all([
    'copyUrl.js', 'createMeasureTooltip.js', 'createVectorLayerFromFile.js',
    'getUniqueDomId.js', 'saveBlob.js',
  ].map(loadUtility));
  copyUrl('https://example.test/map');
  const copiedInput = document.lastElement;
  const polygon = new this.ol.Polygon([[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]);
  const line = new this.ol.LineString([[0, 0], [3, 4]]);
  const circle = new this.ol.Circle([0, 0], 1500);
  const feature = new this.ol.Feature({ geometry: polygon, endCoordinates: [0, 0] });
  const map = {
    addOverlay(overlay) { overlay.map = this; this.overlay = overlay; },
    removeOverlay(overlay) { this.removedOverlay = overlay; overlay.map = null; },
  };
  const measure = createMeasureTooltip({ map, feature });
  const multiLine = new this.ol.MultiLineString([[[0, 0], [3, 4]], [[0, 0], [0, 2]]]);
  const multiMap = {
    addOverlay(overlay) { overlay.map = this; this.overlay = overlay; },
    removeOverlay(overlay) { overlay.map = null; },
  };
  const multiMeasure = createMeasureTooltip({
    map: multiMap,
    feature: new this.ol.Feature({ geometry: multiLine }),
  });
  multiLine.setCoordinates([[[0, 0], [3, 4]], [[0, 0], [0, 2]]]);
  polygon.setCoordinates([[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]);
  const downloaded = [];
  const createObjectURL = URL.createObjectURL;
  const revokeObjectURL = URL.revokeObjectURL;
  URL.createObjectURL = blob => { downloaded.push(['url', blob]); return 'blob:fixture'; };
  URL.revokeObjectURL = value => downloaded.push(['revoke', value]);
  try {
    const blob = new Blob(['fixture']);
    saveBlob(blob, 'attachment; filename=sample.txt');
    const savedLink = document.lastElement;
    this.browser = {
      copied: document.calls.slice(),
      inputSelected: copiedInput.tagName === 'INPUT' && copiedInput.selected,
      area: get_formatted_area(polygon),
      length: get_formatted_length(line),
      multiLineLength: get_formatted_length(multiLine),
      multiLineTooltip: multiMeasure.tooltip.options.element.innerHTML,
      multiLinePosition: multiMeasure.tooltip.position,
      angle: get_formatted_angle([0, 0], [1, 0]),
      radius: get_formatted_radius(circle),
      tooltipText: document.elements.find(element => element.className === 'mtooltip mtooltip-measure').innerHTML,
      tooltipPosition: measure.tooltip.position,
      uniqueIds: [getUniqueDomId(), getUniqueDomId()],
      savedLink: { clicked: savedLink.clicked, href: savedLink.href, filename: savedLink.download },
      downloaded,
    };
    measure.remove();
    multiMeasure.remove();
    this.browser.overlayRemoved = map.removedOverlay === measure.tooltip;
    this.imported = await createVectorLayerFromFile({
      name: 'points',
      type: 'csv',
      crs: 'EPSG:4326',
      mapCrs: 'EPSG:4326',
      data: { headers: ['x', 'y', 'label'], values: ['1,2,Ada', 'bad,3,skip'], separator: ',', x: 'x', y: 'y' },
    });
  } finally {
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
  }
});

Then('local browser interactions produce the expected results', function () {
  assert.deepEqual(this.browser.copied, ['copy']);
  assert.equal(this.browser.inputSelected, true);
  assert.equal(this.browser.area, '100.00 m²');
  assert.equal(this.browser.length, '5.00 m');
  assert.equal(this.browser.multiLineLength, '7.00 m');
  assert.equal(this.browser.multiLineTooltip, '7.00 m');
  assert.deepEqual(this.browser.multiLinePosition, [0, 2]);
  assert.equal(this.browser.angle, '-90°');
  assert.equal(this.browser.radius, '1.50 km');
  assert.match(this.browser.tooltipText, /Area: 100\.00 m²/);
  assert.deepEqual(this.browser.tooltipPosition, [5, 5, 10]);
  assert.notEqual(this.browser.uniqueIds[0], this.browser.uniqueIds[1]);
  assert.deepEqual(this.browser.downloaded.map(entry => entry[0]), ['url', 'revoke']);
  assert.equal(this.browser.downloaded[0][1] instanceof Blob, true);
  assert.deepEqual(this.browser.savedLink, { clicked: true, href: 'blob:fixture', filename: 'sample.txt' });
  assert.equal(this.browser.overlayRemoved, true);
  const [feature] = this.imported.getSource().getFeatures();
  assert.deepEqual(feature.getGeometry().getCoordinates(), [1, 2]);
  assert.equal(feature.getId(), 0);
  assert.deepEqual(feature.getProperties().label, 'Ada');
  assert.deepEqual(this.imported.get('_fields'), ['x', 'y', 'label']);
  assert.equal(this.imported.get('name'), 'points');
});

When('I exercise asynchronous utilities', async function () {
  const [
    { debounce },
    { idb },
    { throttle },
    { toGeoJSON },
    { toShapefile },
    { waitFor },
    { XHR },
  ] = await Promise.all([
    'debounce.js', 'idb.js', 'throttle.js', 'toGeoJSON.js',
    'toShapefile.js', 'waitFor.js', 'XHR.js',
  ].map(loadUtility));

  const records = new Map();
  const store = {
    get(name) {
      const request = {};
      setTimeout(() => { request.result = records.get(name); request.onsuccess?.(); }, 0);
      return request;
    },
    add(record) { return write(record); },
    put(record) { return write(record); },
  };
  function write(record) {
    const request = {};
    setTimeout(() => { records.set(record.name, record); request.onsuccess?.(); }, 0);
    return request;
  }
  const database = {
    objectStoreNames: { contains: () => true },
    transaction: () => ({ objectStore: () => store }),
  };
  globalThis.window.indexedDB = {
    open() {
      const request = { result: database };
      setTimeout(() => request.onsuccess?.(), 0);
      return request;
    },
    deleteDatabase(name) { this.deleted = name; records.clear(); },
  };

  const timerValues = [];
  const debounced = debounce(value => timerValues.push(['debounce', value]), 15);
  debounced(1);
  debounced(2);
  const throttled = throttle(value => timerValues.push(['throttle', value]), 15);
  throttled(1);
  throttled(2);
  await new Promise(resolve => setTimeout(resolve, 25));
  throttled(3);

  await idb.setItem('color', { hex: '#369' });
  const stored = await idb.getItem('color');
  await idb.setItem('color', { hex: '#abc' });
  const overwritten = await idb.getItem('color');
  idb.clear();

  const responseCalls = [];
  globalThis.fetch = async (url, options = {}) => {
    responseCalls.push([url, options]);
    return { text: async () => url.endsWith('/plain') ? 'not-json' : '{"ok":true}' };
  };
  const getResult = await XHR.get({ url: '/items', params: { q: 'a b' } });
  const plainResult = await XHR.get({ url: '/plain' });
  const putResult = await XHR.put({ url: '/put', data: { value: 2 } });
  const postResult = await XHR.post({ url: '/post', data: { value: 3 }, contentType: 'application/json' });

  let ready = false;
  setTimeout(() => { ready = true; }, 10);
  const waitResult = await waitFor(() => ready, 500);
  const archive = await toShapefile({
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [12.5, 41.9, 99] },
      properties: { label: 'Rome', count: 3 },
    }],
  }, { folder: 'offline' });
  const geojson = await toGeoJSON(await archive.arrayBuffer());
  this.asynchronous = {
    timers: timerValues,
    stored,
    overwritten,
    deletedDatabase: window.indexedDB.deleted,
    getResult,
    plainResult,
    putResult,
    postResult,
    responseCalls,
    waitResult,
    archiveType: archive.type,
    geojson,
  };
});

Then('timers storage requests and file conversions return expected results', function () {
  assert.deepEqual(this.asynchronous.timers, [['throttle', 1], ['debounce', 2], ['throttle', 3]]);
  assert.deepEqual(this.asynchronous.stored, { hex: '#369' });
  assert.deepEqual(this.asynchronous.overwritten, { hex: '#abc' });
  assert.equal(this.asynchronous.deletedDatabase, 'default');
  assert.deepEqual(this.asynchronous.getResult, { ok: true });
  assert.equal(this.asynchronous.plainResult, 'not-json');
  assert.deepEqual(this.asynchronous.putResult, { ok: true });
  assert.deepEqual(this.asynchronous.postResult, { ok: true });
  assert.equal(this.asynchronous.responseCalls[0][0], '/items?q=a+b');
  assert.equal(this.asynchronous.responseCalls[1][0], '/plain');
  assert.equal(this.asynchronous.responseCalls[2][1].method, 'PUT');
  assert.equal(this.asynchronous.responseCalls[2][1].body, 'value=2');
  assert.equal(this.asynchronous.responseCalls[3][1].method, 'POST');
  assert.equal(this.asynchronous.responseCalls[3][1].body, '{"value":3}');
  assert.equal(this.asynchronous.waitResult, 'predicate');
  assert.equal(this.asynchronous.archiveType, 'application/zip');
  assert.deepEqual(this.asynchronous.geojson.features, [{
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [12.5, 41.9] },
    properties: { label: 'Rome', count: 3 },
  }]);
});

When('I exercise file import and export formats', { timeout: 120000 }, async function () {
  const [{ createVectorLayerFromFile }, { toGeoJSON }, { toShapefile }] = await Promise.all([
    'createVectorLayerFromFile.js', 'toGeoJSON.js', 'toShapefile.js',
  ].map(loadUtility));
  const geometries = [
    { type: 'Point', coordinates: [1, 2, 50] },
    { type: 'MultiPoint', coordinates: [[3, 4], [5, 6]] },
    { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
    { type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]], [[2, 2], [3, 3]]] },
    { type: 'Polygon', coordinates: [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]] },
    { type: 'MultiPolygon', coordinates: [[[[5, 5], [9, 5], [9, 9], [5, 9], [5, 5]]]] },
  ];
  const input = {
    type: 'FeatureCollection',
    features: geometries.map((geometry, index) => ({
      type: 'Feature',
      geometry,
      properties: {
        label: `feature ${index}`,
        value: index + 0.25,
        enabled: index % 2 === 0,
        ignored: null,
        nested: { ignored: true },
      },
    })),
  };
  const archive = await toShapefile(input, { folder: 'formats' });
  const decoded = await toGeoJSON(archive);
  const imported = await createVectorLayerFromFile({
    name: 'all-geometries',
    type: 'zip',
    crs: 'EPSG:4326',
    mapCrs: 'EPSG:4326',
    data: archive,
  });
  const noKml = new Blob([zipSync({ 'folder/readme.txt': strToU8('not a KML file') })]);
  const malformedKmz = new Blob([Uint8Array.of(1, 2, 3)]);
  const missingKml = await createVectorLayerFromFile({ type: 'kmz', data: noKml })
    .then(() => null, error => error.message);
  const invalidKmz = await createVectorLayerFromFile({ type: 'kmz', data: malformedKmz })
    .then(() => null, error => error.message);
  const kml = '<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>Rome</name><styleUrl>#road</styleUrl><Point><coordinates>12.5,41.9,0</coordinates></Point></Placemark></Document></kml>';
  const importedKml = await importVectorLayerInBrowser({ type: 'kml', data: kml });
  const importedKmz = await importVectorLayerInBrowser({
    type: 'kmz',
    data: zipSync({ 'nested/places.kml': strToU8(kml) }),
  });
  const emptyCsv = await createVectorLayerFromFile({
    type: 'csv',
    crs: 'EPSG:4326',
    mapCrs: 'EPSG:4326',
    data: { headers: ['x', 'y'], values: ['bad,3,extra'], separator: ',', x: 'x', y: 'y' },
  }).then(() => 'unexpected layer', error => error);

  this.fileFormats = {
    decodedTypes: decoded.features.map(feature => feature.geometry.type).sort(),
    importedTypes: imported.getSource().getFeatures().map(feature => feature.getGeometry().getType()).sort(),
    importedLabels: imported.getSource().getFeatures().map(feature => feature.get('label')).sort(),
    importedFields: imported.get('_fields'),
    missingKml,
    invalidKmz,
    importedKml,
    importedKmz,
    emptyCsv,
    messages: globalThis.__utilityGui.messages.slice(),
  };
});

Then('imported features and shapefile geometries retain their data', function () {
  assert.deepEqual(this.fileFormats.decodedTypes, [
    'LineString', 'MultiLineString', 'MultiPoint', 'Point', 'Polygon', 'Polygon',
  ]);
  assert.deepEqual(this.fileFormats.importedTypes, this.fileFormats.decodedTypes);
  assert.deepEqual(this.fileFormats.importedLabels, [
    'feature 0', 'feature 1', 'feature 2', 'feature 3', 'feature 4', 'feature 5',
  ]);
  assert.ok(this.fileFormats.importedFields.includes('label'));
  assert.equal(this.fileFormats.missingKml, 'KMZ archive does not contain a KML file');
  assert.match(this.fileFormats.invalidKmz, /zip|data/i);
  assert.equal(this.fileFormats.emptyCsv, undefined);
  assert.equal(this.fileFormats.messages.length, 1);
  assert.deepEqual(this.fileFormats.messages[0].hooks.footer.data().errors, [
    { row: 1, value: 'bad,3,extra' },
  ]);
  assert.equal(this.fileFormats.importedKml[0].properties.name, 'Rome');
  assert.equal(Object.hasOwn(this.fileFormats.importedKml[0].properties, 'styleUrl'), false);
  assert.deepEqual(this.fileFormats.importedKml[0].coordinates, [12.5, 41.9, 0]);
  assert.equal(this.fileFormats.importedKmz[0].properties.name, 'Rome');
  assert.equal(Object.hasOwn(this.fileFormats.importedKmz[0].properties, 'styleUrl'), false);
});

When('I exercise dimensional and splitting utilities', async function () {
  const [{ addZValue }, { removeZValue }, { splitFeature }] = await Promise.all([
    'addZValue.js', 'removeZValue.js', 'splitFeature.js',
  ].map(loadUtility));
  const dimensional = [
    [this.ol.Point, [1, 2]],
    [this.ol.MultiPoint, [[1, 2], [3, 4]]],
    [this.ol.LineString, [[0, 0], [1, 1]]],
    [this.ol.MultiLineString, [[[0, 0], [1, 1]], [[2, 2], [3, 3]]]],
    [this.ol.Polygon, [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]]],
    [this.ol.MultiPolygon, [[[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]]]],
  ].map(([Geometry, coordinates]) => new this.ol.Feature({ geometry: new Geometry(coordinates) }));
  const withZ = dimensional.map(feature => {
    addZValue({ feature, geometryType: `${feature.getGeometry().getType()}Z` });
    return feature.getGeometry().getCoordinates();
  });
  const removedZ = dimensional.map(feature => {
    removeZValue({ feature });
    return feature.getGeometry().getCoordinates();
  });
  const line = new this.ol.Feature({ geometry: new this.ol.LineString([[0, 0], [10, 0]]) });
  const splitter = new this.ol.Feature({ geometry: new this.ol.LineString([[5, -1], [5, 1]]) });
  const linePieces = splitFeature({ feature: line, splitfeature: splitter });
  const multiLine = new this.ol.Feature({
    geometry: new this.ol.MultiLineString([[[0, 0], [10, 0]], [[0, 5], [10, 5]]]),
  });
  const multiLinePieces = splitFeature({ feature: multiLine, splitfeature: splitter });
  const outer = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
  const hole = [[2, 2], [2, 4], [4, 4], [4, 2], [2, 2]];
  const polygonPieces = splitFeature({
    feature: new this.ol.Feature({ geometry: new this.ol.Polygon([outer, hole]) }),
    splitfeature: new this.ol.Feature({ geometry: new this.ol.LineString([[5, -1], [5, 11]]) }),
  });
  const zPolygonPieces = splitFeature({
    feature: new this.ol.Feature({
      geometry: new this.ol.Polygon([[[0, 0, 1], [10, 0, 2], [10, 10, 3], [0, 10, 4], [0, 0, 1]]]),
    }),
    splitfeature: new this.ol.Feature({ geometry: new this.ol.LineString([[5, -1], [5, 11]]) }),
  });
  const multiPolygon = new this.ol.Feature({
    geometry: new this.ol.MultiPolygon([
      [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]],
      [[[6, 0], [10, 0], [10, 4], [6, 4], [6, 0]]],
    ]),
  });
  const multiPolygonPieces = splitFeature({
    feature: multiPolygon,
    splitfeature: new this.ol.Feature({ geometry: new this.ol.LineString([[2, -1], [2, 5]]) }),
  });
  this.dimensional = {
    withZ,
    removedZ,
    linePieces: linePieces.map(geometry => geometry.getCoordinates()),
    multiLinePieces: multiLinePieces.map(geometry => geometry.getType()),
    polygonPieces: polygonPieces.map(geometry => geometry.getType()),
    zPolygonPieces: zPolygonPieces.map(geometry => geometry.getCoordinates()),
    multiPolygonPieces: multiPolygonPieces.map(geometry => geometry.getType()),
  };
});

Then('real OpenLayers geometries retain their dimensions and split results', function () {
  assert.deepEqual(this.dimensional.withZ, [
    [1, 2, 0],
    [[1, 2, 0], [3, 4, 0]],
    [[0, 0, 0], [1, 1, 0]],
    [[[0, 0, 0], [1, 1, 0]], [[2, 2, 0], [3, 3, 0]]],
    [[[0, 0, 0], [4, 0, 0], [4, 4, 0], [0, 4, 0], [0, 0, 0]]],
    [[[[0, 0, 0], [4, 0, 0], [4, 4, 0], [0, 4, 0], [0, 0, 0]]]],
  ]);
  assert.deepEqual(this.dimensional.removedZ, [
    [1, 2],
    [[1, 2], [3, 4]],
    [[0, 0], [1, 1]],
    [[[0, 0], [1, 1]], [[2, 2], [3, 3]]],
    [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]],
    [[[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]]],
  ]);
  assert.equal(this.dimensional.linePieces.length, 2);
  assert.deepEqual(this.dimensional.linePieces.map(line => line[0]), [[0, 0], [5, 0]]);
  assert.ok(this.dimensional.multiLinePieces.length >= 2);
  assert.equal(this.dimensional.polygonPieces.length, 2);
  assert.equal(this.dimensional.zPolygonPieces.length, 2);
  assert.ok(this.dimensional.zPolygonPieces.flat(2).every(coordinate => coordinate.length === 3));
  assert.ok(this.dimensional.multiPolygonPieces.length >= 2);
});

When('I exercise registered download actions', async function () {
  this.catalogRequests = [];
  await this.corePage.route('**/fixture/catalog-download', async route => {
    const request = route.request();
    this.catalogRequests.push({
      url: new URL(request.url()).pathname,
      method: request.method(),
      body: request.postData(),
    });
    await route.fulfill({
      contentType: 'text/csv',
      headers: { 'content-disposition': 'attachment; filename=roads.csv' },
      body: 'name,value\nRoad,Main\n',
    });
  });
  await this.corePage.evaluate(() => {
    const layer = createFixtureLayer({
      id: 'roads', name: 'Roads', title: 'Roads', download_csv: true,
    });
    layer.setUrl({ type: 'csv', url: '/fixture/catalog-download' });
    const feature = { attributes: { g3w_fid: 17 } };
    const actions = { roads: [] };
    g3w.state.query = { type: 'polygon', fid: 17 };
    g3w.app.addActionsForLayers(actions, [{ id: 'roads', downloads: ['Csv'], features: [feature] }]);
    const [action] = actions.roads;
    action.change({ features: [feature] });
    delete action.state.toggled[0];
    action.change({ features: [feature] });
    action.cbk(layer.state, feature, action, 0);
    window.catalogExportAction = action;
  });
  const dialog = this.corePage.locator('dialog[open]');
  await dialog.waitFor();
  await dialog.locator('[name="format"]').selectOption('Csv');
  await dialog.locator('[name="down_with_polygon"]').selectOption('1');
  const pending = this.corePage.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download' }).click();
  const download = await pending;
  this.catalogDownload = {
    filename: download.suggestedFilename(),
    contents: fs.readFileSync(await download.path(), 'utf8'),
  };
  await this.corePage.waitForFunction(() => !g3w.state.download && !document.querySelector('dialog[open]'));
  this.download = await this.corePage.evaluate(() => ({
    actionState: catalogExportAction.state.toggled[0],
    downloadReset: g3w.state.download,
  }));
});

Then('catalog export requests and action state are preserved', function () {
  assert.equal(this.download.actionState, false);
  assert.equal(this.download.downloadReset, false);
  assert.deepEqual(this.catalogRequests.map(({ url, method }) => ({ url, method })), [
    { url: '/fixture/catalog-download', method: 'POST' },
  ]);
  assert.match(this.catalogRequests[0].body, /name="sbp_qgs_layer_id"\r\n\r\nroads/);
  assert.match(this.catalogRequests[0].body, /name="sbp_fid"\r\n\r\n1/);
  assert.match(this.catalogRequests[0].body, /name="fids"\r\n\r\n17/);
  assert.deepEqual(this.catalogDownload, {
    filename: 'roads.csv',
    contents: 'name,value\nRoad,Main\n',
  });
});

When('I exercise storage and request error paths', async function () {
  const [{ idb }, { waitFor }, { XHR }] = await Promise.all(['idb.js', 'waitFor.js', 'XHR.js'].map(loadUtility));
  const originalError = console.error;
  const loggedErrors = [];
  console.error = (...args) => loggedErrors.push(args);
  try {
    globalThis.window.indexedDB = {
      open: () => {
        const request = { result: undefined };
        setTimeout(() => request.onerror?.('database unavailable'), 0);
        return request;
      },
    };
    const unavailable = await idb.getItem('offline');
    let indexes = 0;
    let requestMode = 'read-error';
    const store = {
      get() {
        const request = {};
        setTimeout(() => {
          if ('read-error' === requestMode) {
            request.onerror?.('read failed');
          } else {
            request.result = 'write-error' === requestMode ? { value: 'old' } : undefined;
            request.onsuccess?.();
          }
        }, 0);
        return request;
      },
      add() {
        const request = {};
        setTimeout(() => request.onerror?.('write failed'), 0);
        return request;
      },
      put() {
        const request = {};
        setTimeout(() => request.onerror?.('write failed'), 0);
        return request;
      },
    };
    let storeCreated = false;
    const database = {
      objectStoreNames: { contains: () => storeCreated },
      createObjectStore() {
        storeCreated = true;
        return { createIndex() { indexes++; } };
      },
      transaction: () => ({ objectStore: () => store }),
    };
    globalThis.window.indexedDB.open = () => {
      const request = { result: database };
      setTimeout(() => {
        request.onupgradeneeded?.();
        request.onsuccess?.();
      }, 0);
      return request;
    };
    await idb.open();
    const readFailure = await idb.setItem('offline', { value: 1 });
    requestMode = 'write-error';
    const writeFailure = await idb.setItem('offline', { value: 2 });
    requestMode = 'read-error';
    const getFailure = await idb.getItem('offline');
    const requestCalls = [];
    globalThis.fetch = async url => {
      requestCalls.push(url);
      return { text: async () => 'plain response' };
    };
    const putText = await XHR.put({ url: '/put-plain' });
    const postText = await XHR.post({ url: '/post-plain' });
    const putForm = await XHR.put({ url: '/put-form', formdata: true, data: { place: 'Rome' } });
    const postForm = await XHR.post({ url: '/post-form', formdata: true, data: { place: 'Milan' } });
    const timeout = await waitFor(() => false, 1).then(() => null, error => error);
    this.errorPaths = {
      unavailable,
      indexes,
      readFailure,
      writeFailure,
      getFailure,
      putText,
      postText,
      putForm,
      postForm,
      timeout,
      requestCalls,
      loggedErrors: loggedErrors.length,
    };
  } finally {
    console.error = originalError;
  }
});

Then('unavailable storage and plain-text responses resolve as expected', function () {
  assert.equal(this.errorPaths.unavailable, undefined);
  assert.equal(this.errorPaths.indexes, 1);
  assert.equal(this.errorPaths.readFailure, 'read failed');
  assert.equal(this.errorPaths.writeFailure, 'write failed');
  assert.equal(this.errorPaths.getFailure, undefined);
  assert.equal(this.errorPaths.putText, 'plain response');
  assert.equal(this.errorPaths.postText, 'plain response');
  assert.equal(this.errorPaths.putForm, 'plain response');
  assert.equal(this.errorPaths.postForm, 'plain response');
  assert.equal(this.errorPaths.timeout, 'timeout');
  assert.deepEqual(this.errorPaths.requestCalls, [
    '/put-plain', '/post-plain', '/put-form', '/post-form',
  ]);
  assert.equal(this.errorPaths.loggedErrors, 4);
});
