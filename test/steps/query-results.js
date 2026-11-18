const assert = require('node:assert/strict');
const { After, Before, Then } = require('@cucumber/cucumber');

Before({ tags: '@query-results' }, async function () {
  await this.corePage.evaluate(() => {
    Vue.prototype.$fa = name => `icon-${name}`;
    window.queryMap = new ol.Map({
      layers: [], controls: [], interactions: [], view: new ol.View({ center: [0, 0], zoom: 2 }),
    });
    queryMap.setSize([256, 256]);
    window.queryEffects = { highlights: [], geometryHighlights: [], zooms: [], info: [], closed: 0 };
    const snapshot = geometry => geometry?.getType
      ? { type: geometry.getType(), coordinates: geometry.getCoordinates() }
      : geometry === false ? false : null;
    g3w.app.getMap = () => queryMap;
    g3w.app.highlight = (geometry, options = {}) => queryEffects.highlights.push({ geometry: snapshot(geometry), zoom: options.zoom });
    g3w.app.highlightGeometry = (geometry, options = {}) => queryEffects.geometryHighlights.push({ geometry: snapshot(geometry), zoom: options.zoom });
    g3w.app.zoomToLayer = layer => queryEffects.zooms.push(layer.id);
    g3w.app.on('show-query-feature-info', ({ layer, tabs, show }) => queryEffects.info.push({ id: layer.id, tabs, show }));
    g3w.app.on('onafter:closeComponent', () => queryEffects.closed++);
    Object.assign(g3w.state, { query: { type: 'search', pagination: null }, mapUnits: 'm', logged: true });
    g3w.state.project.state.layerstree = [];
    g3w.state.project.getPrint = () => [];
    window.createQueryLayer = (id, config = {}) => {
      const layer = createFixtureLayer({
        id, name: id, title: id, toc: true,
        fields: [{ name: 'name', label: 'Name', type: 'varchar', show: true }],
        ...config,
      });
      g3w.state.project.state.layerstree.push({ id });
      return layer;
    };
    window.queryFeature = (id, attributes = {}, geometry = null) => {
      const feature = new ol.Feature({ ...attributes, geometry });
      feature.setId(id);
      return feature;
    };
    window.presentQueryResults = async (data, query = { type: 'search', pagination: null }) => {
      g3w.app.setQueryResponse({ data, query, type: 'ows' });
      await Vue.nextTick();
      await new Promise(requestAnimationFrame);
      await Vue.nextTick();
      return g3w.state.queried_layers;
    };
    window.mountQueryResults = async () => {
      window.queryResults = await mountFormComponent(coreTestExports.QueryResults);
      return queryResults;
    };
  });
});

After({ tags: '@query-results' }, async function () {
  await this.corePage.evaluate(() => {
    if (window.queryResults && !queryResults._isDestroyed) queryResults.$destroy();
    queryMap.dispose();
  });
});

Then('query summaries format coordinates extents and polygon identities', async function () {
  const result = await this.corePage.evaluate(async () => {
    const results = await mountQueryResults();
    const queries = [
      { type: 'coordinates', coordinates: [12.345678, 45.678912] },
      { type: 'bbox', bbox: [1, 2, 3.125, 4.875] },
      { type: 'circle' },
      { type: 'polygon', layerName: 'Roads', fid: 7 },
      { type: 'drawpolygon' },
      { type: 'search' },
    ];
    const info = [];
    for (const query of queries) {
      g3w.state.query = query;
      info.push({ ...results.info });
    }
    g3w.state.mapUnits = 'degrees';
    g3w.state.query = queries[0];
    const geographic = { ...results.info };
    g3w.state.changed = true;
    await Vue.nextTick();
    return {
      info, geographic, empty: !!results.$el.querySelector('.query-results-not-found'),
      hasLayers: results.hasLayers, queryable: results.queryableLayers.length, selected: results.selectedLayer,
    };
  });
  assert.deepEqual(result, {
    info: [
      { icon: 'marker', message: '  12.35, 45.68' }, { icon: 'square', message: '  [1.00 , 2.00 , 3.13 , 4.88]' },
      { icon: 'empty-circle', message: ' ' }, { icon: 'draw', message: 'Roads  - Feature Id: 7' },
      { icon: 'draw', message: ' ' }, { icon: null, message: null },
    ],
    geographic: { icon: 'marker', message: '  12.3457, 45.6789' }, empty: true,
    hasLayers: false, queryable: 0, selected: null,
  });
});

Then('rendered query layers preserve field values and feature expansion state', async function () {
  const result = await this.corePage.evaluate(async () => {
    const roads = createQueryLayer('roads', { fields: [
      { name: 'name', label: 'Name', type: 'varchar', show: true },
      { name: 'website', label: 'Website', type: 'varchar', show: true },
      { name: 'tags', label: 'Tags', type: 'varchar', show: true },
      { name: 'details', label: 'Details', type: 'varchar', show: true },
    ] });
    const rivers = createQueryLayer('rivers');
    const results = await mountQueryResults();
    const layers = await presentQueryResults([
      { layer: roads, features: [
        queryFeature(1, { name: 'Main', website: 'https://example.test/', tags: ['A', 'B'], details: { owner: { name: 'Council' } } }),
        queryFeature(2, { name: 'Side', website: 'https://example.test/map.png', tags: [], details: { length: 10 } }),
      ] },
      { layer: rivers, features: [queryFeature(3, { name: 'River' })] },
    ]);
    const layer = layers.find(layer => layer.id === 'roads');
    const feature = layer.features[0];
    const initial = results.collapsedFeatureBox(layer, feature);
    const field = results.getLayerField({ layer, feature, fieldName: 'tags' });
    await results.toggleFeatureBoxAndZoom(layer, feature);
    await Vue.nextTick();
    const expanded = !results.collapsedFeatureBox(layer, feature) && document.getElementById('roads_0').style.display !== 'none';
    const selector = results.$el.querySelector('div[style*="sticky"] select');
    selector.value = 'rivers';
    selector.dispatchEvent(new Event('change'));
    await Vue.nextTick();
    const filtered = results.$el.querySelectorAll('li > .box').length;
    selector.value = '';
    selector.dispatchEvent(new Event('change'));
    await Vue.nextTick();
    const box = document.getElementById('roads_0').closest('.box');
    results.collapseSidebar({ target: box.querySelector('.box-header') });
    const collapsed = box.classList.contains('collapsed-box');
    results.collapseSidebar({ target: box.querySelector('.box-header') });
    return {
      initial, expanded, tags: field.value, colspan: results.getColSpan(layer), filtered,
      restored: results.$el.querySelectorAll('li > .box').length,
      json: results.$el.textContent.includes('Council'), emptyArray: results.sanitizeFieldValue([]),
      types: [
        results.isSimple({ value: 'Name' }), results.isLink({ value: 'https://example.test/' }),
        results.isPhoto({ value: 'https://example.test/image.png' }), results.isVue({ type: 'vue', value: {} }),
      ],
      collapsed, reopened: !box.classList.contains('collapsed-box'),
      info: queryEffects.info,
    };
  });
  assert.equal(result.initial, true);
  assert.equal(result.expanded, true);
  assert.equal(result.tags, 'A,B');
  assert.equal(result.colspan, 4);
  assert.equal(result.filtered, 1);
  assert.equal(result.restored, 2);
  assert.equal(result.json, true);
  assert.equal(result.emptyArray, '');
  assert.deepEqual(result.types, [true, true, true, true]);
  assert.equal(result.collapsed, true);
  assert.equal(result.reopened, true);
  assert.deepEqual(result.info, [{ id: 'roads', tabs: false, show: true }]);
});

Then('query result forms render nested fields without changing their source layout', async function () {
  const result = await this.corePage.evaluate(async () => {
    const layer = createQueryLayer('roads', {
      fields: [{ name: 'road name', label: 'Road name', type: 'varchar', show: true }],
      editor_form_structure: [{ name: 'Main', nodes: [{ name: 'Group', nodes: [{ field_name: 'road name' }] }] }],
    });
    const results = await mountQueryResults();
    const [rendered] = await presentQueryResults([{ layer, features: [queryFeature(1, { road_name: 'Main road' })] }]);
    const fields = results.getQueryFields(rendered, rendered.features[0]);
    const layout = results.getLayerFormStructure(rendered);
    layout[0].name = 'Changed locally';
    return {
      text: results.$el.textContent.includes('Main road'),
      subset: results.attributesSubset(rendered).map(({ name }) => name),
      fields: fields.map(({ name, query, value, input }) => ({ name, query, value, type: input.type })),
      original: rendered.formStructure.structure[0].name,
      info: queryEffects.info, single: results.hasLayerOneFeature(rendered),
    };
  });
  assert.deepEqual(result, {
    text: true, subset: ['road_name'],
    fields: [
      { name: 'road name', query: true, value: 'Main road', type: 'simple_field' },
    ],
    original: 'Main', info: [{ id: 'roads', tabs: true, show: true }], single: true,
  });
});

Then('related result boxes expand independently and reset for a new response', async function () {
  const result = await this.corePage.evaluate(async () => {
    const layer = createQueryLayer('roads');
    const results = await mountQueryResults();
    const [rendered] = await presentQueryResults([{ layer, features: [
      queryFeature(1, { name: 'Main', relations: [{ name: 'owners', elements: [{ name: 'Council' }, { name: 'State' }] }] }),
      queryFeature(2, { name: 'Side', relations: [{ name: 'owners', elements: [{ name: 'Council' }] }] }),
    ] }]);
    const keys = ['roads_1_owners0', 'roads_1_owners1', 'roads_2_owners0'];
    const collapsed = () => keys.map(key => g3w.state.layersFeaturesBoxes[key].collapsed);
    const initial = collapsed();
    await results.toggleFeatureBox(rendered, rendered.features[0], 'owners0');
    const expanded = collapsed();
    await results.toggleFeatureBox(rendered, rendered.features[0], 'owners0');
    const restored = collapsed();
    await presentQueryResults([{ layer, features: [
      queryFeature(3, { name: 'New road', relations: [{ name: 'owners', elements: [{ name: 'Private' }] }] }),
    ] }]);
    return {
      initial, expanded, restored,
      oldBoxes: keys.some(key => Object.hasOwn(g3w.state.layersFeaturesBoxes, key)),
      newBox: g3w.state.layersFeaturesBoxes.roads_3_owners0.collapsed,
    };
  });
  assert.deepEqual(result, {
    initial: [true, true, true], expanded: [false, true, true], restored: [true, true, true],
    oldBoxes: false, newBox: true,
  });
});

Then('result actions respect conditions disabled states and cleanup callbacks', async function () {
  const result = await this.corePage.evaluate(async () => {
    const layer = createQueryLayer('roads');
    const results = await mountQueryResults();
    g3w.app.setQueryResponse({
      data: [{ layer, features: [queryFeature(1, { name: 'Main' }), queryFeature(2, { name: 'Side' })] }],
      query: { type: 'search' }, type: 'ows',
    });
    const calls = { conditions: [], init: [], clear: [], trigger: [] };
    const allowed = {
      id: 'custom', hint: 'Custom action', opened: true, state: { show: true, disabled: false },
      condition: async ({ feature }) => { calls.conditions.push(feature.id); return feature.id === 1; },
      init: ({ feature }) => calls.init.push(feature.id),
      clear: ({ feature }) => calls.clear.push(feature.id),
      cbk: (layer, feature, action, index, cells) => calls.trigger.push({ layer: layer.id, feature: feature.id, action: action.id, index, cells: cells.length }),
    };
    g3w.state.layersactions.roads = [allowed, { id: 'hidden', hint: 'Hidden action', state: { show: false } }];
    await Vue.nextTick();
    await coreTestExports.waitFor(() => results.layer_feature_actions.roads__1?.length === 1 && results.layer_feature_actions.roads__2?.length === 0, 1000);
    const rendered = g3w.state.queried_layers[0];
    const cached = results.getFeatureActions({ actions: [allowed], layer: rendered, feature: rendered.features[0], index: 0 });
    const sameCache = cached === results.getFeatureActions({ layer: rendered, feature: rendered.features[0], index: 0 });
    const button = results.$el.querySelector('button[title="Custom action"]');
    g3w.state.download = true;
    button.click();
    g3w.state.download = false;
    allowed.state.disabled = true;
    button.click();
    allowed.state.disabled = false;
    button.click();
    await coreTestExports.waitFor(() => calls.trigger.length === 1, 1000);
    await results.trigger({ id: 'highlightgeometry' }, rendered, rendered.features[0], 0);
    await results.trigger({ id: 'clearHighlightGeometry' }, rendered, rendered.features[0], 0);
    const expanded = !results.collapsedFeatureBox(rendered, rendered.features[0]);
    results.$destroy();
    return { calls, sameCache, expanded, cleared: g3w.state.queried_layers.length, closed: queryEffects.closed };
  });
  assert.deepEqual(result, {
    calls: { conditions: [1, 2], init: [1], clear: [1], trigger: [{ layer: 'roads', feature: 1, action: 'custom', index: 0, cells: 1 }] },
    sameCache: true, expanded: true, cleared: 0, closed: 1,
  });
});

Then('query pagination requests the selected page and updates its selection state', async function () {
  const requests = [];
  await this.corePage.route('**/vector/data/**', route => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ json: { result: true, vector: { count: 5, data: {
      type: 'FeatureCollection', features: [3, 4].map(id => ({
        type: 'Feature', id, properties: { name: `Road ${id}` }, geometry: { type: 'Point', coordinates: [id, id] },
      })),
    } } } });
  });
  const result = await this.corePage.evaluate(async () => {
    const layer = createQueryLayer('roads', { geometrytype: 'Point', crs: { epsg: 'EPSG:3857' } });
    layer.state.selection.active = true;
    const selections = [];
    g3w.app.toggleSelection = async (layer, feature, force) => selections.push({ id: feature.id, force });
    const query = { type: 'search', autofilter: true, pagination: {
      roads: { layer, paginate: true, current: 1, current_sizes: 1, page_sizes: [1, 2], pages: 5, count: 5 },
      getData: { method: 'getFilterData', params: {
        roads: { filter: 'name|eq|Road', autofilter: true, page_size: 1 }, other: { autofilter: true },
      } },
    } };
    const results = await mountQueryResults();
    await presentQueryResults([{ layer, features: [queryFeature(1, { name: 'First' }, new ol.geom.Point([1, 1]))] }], query);
    await results.changePage('roads', 2, 2);
    await Vue.nextTick();
    const rendered = g3w.state.queried_layers[0];
    return {
      pagination: { current: query.pagination.roads.current, pages: query.pagination.roads.pages, paginate: query.pagination.roads.paginate },
      params: query.pagination.getData.params, autofilter: query.autofilter,
      selected: rendered.features.map(feature => [feature.id, feature.selected]), selections,
      action: g3w.state.layersactions.roads.find(action => action.id === 'selection').state.toggled,
      filter: [rendered.filter.active, rendered.filter.pagination], loading: rendered.loading,
      contentDisabled: g3w.state.content.disabled,
      highlight: queryEffects.highlights.at(-1),
    };
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].page, 2);
  assert.equal(requests[0].page_size, 2);
  assert.equal(requests[0].field, 'name|eq|Road');
  assert.equal(Object.hasOwn(requests[0], 'autofilter'), false);
  assert.deepEqual(result, {
    pagination: { current: 2, pages: 3, paginate: true },
    params: { roads: { filter: 'name|eq|Road', page_size: 2, field: 'name|eq|Road' }, other: {} }, autofilter: false,
    selected: [[3, true], [4, true]], selections: [{ id: 3, force: 'paginate' }, { id: 4, force: 'paginate' }],
    action: { 0: true, 1: true }, filter: [true, false], loading: false, contentDisabled: false,
    highlight: { geometry: { type: 'MultiPoint', coordinates: [[3, 3], [4, 4]] }, zoom: false },
  });
});

Then('{string} query responses render safely inside their result iframe', async function (format) {
  const result = await this.corePage.evaluate(async format => {
    const layer = createQueryLayer('raw');
    layer.setInfoFormat(format);
    const results = await mountQueryResults();
    const rawdata = format === 'text/plain' ? '<b>Text & values</b>' : '<div style="height:260px"><a href="https://example.test/"><span>External</span></a></div>';
    await presentQueryResults([{ layer, rawdata }]);
    await coreTestExports.waitFor(() => results.$el.querySelector('iframe')?.style.height, 1000);
    const iframe = results.$el.querySelector('iframe');
    const doc = iframe.contentDocument;
    const confirmations = [];
    const opened = [];
    const originalOpen = window.open;
    window.open = (...args) => { opened.push(args); return null; };
    g3w.app.confirm = async message => { confirmations.push(message); return confirmations.length === 2; };
    try {
      if (format === 'text/html') {
        doc.querySelector('a span').click();
        await Vue.nextTick();
        doc.querySelector('a').click();
        await coreTestExports.waitFor(() => opened.length === 1, 1000);
      }
      return {
        text: doc.body.textContent, htmlElements: doc.querySelectorAll('b').length,
        height: Number.parseFloat(iframe.style.height), sandbox: iframe.getAttribute('sandbox'),
        confirmations: confirmations.length, opened,
      };
    } finally {
      window.open = originalOpen;
    }
  }, format);
  assert.equal(result.sandbox, 'allow-same-origin');
  if (format === 'text/plain') {
    assert.equal(result.text, '<b>Text & values</b>');
    assert.equal(result.htmlElements, 0);
    assert.ok(result.height >= 120);
    assert.equal(result.confirmations, 0);
    assert.deepEqual(result.opened, []);
  } else {
    assert.equal(result.text, 'External');
    assert.ok(result.height >= 260);
    assert.equal(result.confirmations, 2);
    assert.deepEqual(result.opened, [['https://example.test/', '_blank', 'noopener,noreferrer']]);
  }
});

Then('result info formats switch between local text and GML responses', async function () {
  const requests = [];
  await this.corePage.route('**/fixture/proxy', route => {
    const data = route.request().postDataJSON();
    requests.push(data);
    return route.fulfill({ body: data.params.INFO_FORMAT === 'text/gml'
      ? `<?xml version="1.0"?><wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs" xmlns:gml="http://www.opengis.net/gml" xmlns:qgs="http://www.qgis.org/gml">
          <gml:featureMember><qgs:roads fid="roads.7"><qgs:name>Main road</qgs:name>
          <qgs:geometry><gml:Point srsName="EPSG:3857"><gml:coordinates>12,45,3</gml:coordinates></gml:Point></qgs:geometry>
          </qgs:roads></gml:featureMember></wfs:FeatureCollection>`
      : 'A plain report' });
  });
  const result = await this.corePage.evaluate(async () => {
    initConfig.proxyurl = '/fixture/proxy';
    const layer = createQueryLayer('roads', { origname: 'roads', infoformats: ['text/plain', 'text/gml'] });
    layer.state.proxyData.wms = {
      url: 'http://core.test/upstream', method: 'GET', params: { INFO_FORMAT: 'text/plain' }, headers: {},
    };
    const results = await mountQueryResults();
    const [rendered] = await presentQueryResults([{ layer, rawdata: 'Original report' }]);
    await results.changeInfoFormat(rendered, 'text/plain');
    const plain = { raw: rendered.rawdata, features: rendered.features.length, geometry: rendered.hasgeometry };
    await results.changeInfoFormat(rendered, 'text/gml');
    await Vue.nextTick();
    const parsed = {
      raw: rendered.rawdata, name: rendered.features[0]?.attributes.name,
      geometry: rendered.features[0]?.geometry.getCoordinates(), attributes: rendered.attributes.map(({ name }) => name),
      loading: rendered.loading, format: layer.getInfoFormat(), tracked: results.proxied_layers.length,
    };
    results.$destroy();
    return { plain, parsed, released: layer.state.proxyData.wms === null };
  });
  assert.equal(requests.length, 2);
  assert.deepEqual(requests.map(request => request.headers['Content-Type']), ['text/plain', 'text/gml']);
  assert.deepEqual(result, {
    plain: { raw: 'A plain report', features: 0, geometry: false },
    parsed: { raw: null, name: 'Main road', geometry: [12, 45, 3], attributes: ['name'], loading: false, format: 'text/gml', tracked: 1 },
    released: true,
  });
});

Then('query result toolbar actions use the selected layer and current filter', async function () {
  const result = await this.corePage.evaluate(async () => {
    const layer = createQueryLayer('roads', { download_csv: true });
    const calls = [];
    layer.saveFilter = () => calls.push('save');
    layer.toggleToken = async () => calls.push('filter');
    layer.openAttributeTable = options => calls.push(['table', options]);
    g3w.app.toggleSelection = async layer => calls.push(['selection', layer.id]);
    g3w.app.addLayerFeaturesToResultsAction = layer => calls.push(['features', layer.id]);
    g3w.app.printAtlas = layer => calls.push(['atlas', layer.id]);
    const results = await mountQueryResults();
    const [rendered] = await presentQueryResults([{ layer, features: [queryFeature(1, { name: 'Main' })] }]);
    results.openAttributeTable(rendered);
    results.saveFilter(rendered);
    await results.toggleFilter(rendered);
    await results.toggleSelection(rendered);
    results.addLayerFeaturesToResults(rendered);
    results.printAtlas(rendered);
    results.zoomToLayer(rendered);
    const canOpen = results.canOpenAttibuteTable(rendered);
    const canSelect = !!results.canSelect(rendered);
    rendered.filter.active = true;
    const filteredSelect = !!results.canSelect(rendered);
    const custom = [{ component: { template: '<strong>Custom layer</strong>' } }];
    Vue.set(g3w.state.layerscustomcomponents, 'roads', { layer: { before: custom } });
    await Vue.nextTick();
    const customContent = results.$el.textContent.includes('Custom layer');
    results.showDownloadModal(rendered);
    const dialog = Array.from(document.querySelectorAll('dialog')).find(dialog => dialog.querySelector('[name="format"]'));
    const formats = Array.from(dialog.querySelector('[name="format"]').options, option => option.value);
    dialog.close();
    const opened = [];
    const originalOpen = window.open;
    window.open = (...args) => { opened.push(args); return null; };
    try {
      results.openLink('https://example.test/details');
    } finally {
      window.open = originalOpen;
    }
    return { calls, canOpen, canSelect, filteredSelect, customContent, formats, opened, zooms: queryEffects.zooms };
  });
  assert.deepEqual(result, {
    calls: [['table', { perc: 100 }], 'save', 'filter', ['selection', 'roads'], ['features', 'roads'], ['atlas', 'roads']],
    canOpen: true, canSelect: true, filteredSelect: false, customContent: true, formats: ['Csv'],
    opened: [['https://example.test/details', '_blank']], zooms: ['roads'],
  });
});
