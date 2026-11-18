const assert = require('node:assert/strict');
const { After, Before, Then } = require('@cucumber/cucumber');

Before({ tags: '@attribute-tables' }, async function () {
  this.tableRequests = [];
  this.tableWarnings = [];
  this.tableNoGeometry = false;
  this.tableExpectedWarning = false;
  this.corePage.on('console', message => {
    if (['warning', 'error'].includes(message.type())) this.tableWarnings.push(message.text());
  });
  await this.corePage.route('**/vector/data/**', route => {
    const url = new URL(route.request().url());
    const params = route.request().method() === 'GET'
      ? Object.fromEntries(url.searchParams)
      : route.request().postDataJSON();
    this.tableRequests.push(params);
    let features = Array.from({ length: 12 }, (_, index) => ({
      type: 'Feature', id: index + 1,
      properties: { name: `Road${String(index + 1).padStart(2, '0')}`, kind: index % 2 ? 'main' : 'local', tags: ['A', 'B'], road_id: index + 1 },
      geometry: this.tableNoGeometry ? null : { type: 'Point', coordinates: [index + 1, index + 2] },
    }));
    if (params.fids) features = features.filter(feature => params.fids.split(',').includes(`${feature.id}`));
    if (params.search) features = features.filter(feature => feature.properties.name.includes(params.search));
    if (params.field) {
      for (const expression of params.field.split(',')) {
        const [name, , value] = expression.split('|');
        features = features.filter(feature => `${feature.properties[name]}`.includes(value));
      }
    }
    if (params.ordering) {
      const descending = params.ordering.startsWith('-');
      const field = params.ordering.replace(/^-/, '');
      features.sort((a, b) => `${a.properties[field]}`.localeCompare(`${b.properties[field]}`) * (descending ? -1 : 1));
    }
    const count = features.length;
    if (params.page_size) {
      const start = ((params.page || 1) - 1) * params.page_size;
      features = features.slice(start, start + params.page_size);
    }
    return route.fulfill({ json: { result: true, vector: { count, data: { type: 'FeatureCollection', features } } } });
  });
  await this.corePage.evaluate(async () => {
    g3w.gettext.register('en', (await import('/static/client/locales/en.js')).default);
    Vue.prototype.$fa = name => `icon-${name}`;
    Vue.set(g3w.state.layout[g3w.state.layout.__current], 'rightpanel', { height_100: false });
    window.tableEffects = { content: [], highlights: [], extents: [], relations: [], data: [], messages: [], metadata: 0 };
    document.querySelector('#fixture').insertAdjacentHTML('beforebegin',
      '<section id="g3w-content"><header><div class="g3-content-header-action-tools"></div></header></section>' +
      '<dialog id="modal-metadata"><a href="#metadata_layers">Layers</a></dialog>');
    document.querySelector('#modal-metadata a').addEventListener('click', event => { event.preventDefault(); tableEffects.metadata++; });
    window.tableMap = new ol.Map({ layers: [], controls: [], interactions: [], view: new ol.View({ center: [0, 0], zoom: 2 }) });
    tableMap.setSize([256, 256]);
    g3w.app.getMap = () => tableMap;
    g3w.app.getMapBBOX = () => tableMap.getView().calculateExtent([256, 256]);
    g3w.app.showContent = options => tableEffects.content.push({
      id: options.content.getId(), title: options.title, split: options.split, push: options.push,
    });
    g3w.app.closeSideBar = () => {};
    g3w.app.showData = async data => tableEffects.data.push(data);
    g3w.app.showRelations = options => tableEffects.relations.push({ id: options.feature.id, layer: options.layerId, push: options.push });
    g3w.app.zoomToExtent = extent => tableEffects.extents.push(extent);
    g3w.app.showUserMessage = message => tableEffects.messages.push(message);
    g3w.app.highlight = (geometry, options = {}) => tableEffects.highlights.push({
      geometry: geometry?.getType ? { type: geometry.getType(), coordinates: geometry.getCoordinates() } : geometry,
      zoom: options.zoom,
    });
    g3w.state.project.state.layerstree = [{ id: 'roads' }];
    window.mountTable = async (config = {}) => {
      window.tableLayer = createFixtureLayer({
        id: 'roads', name: 'roads', title: 'Roads', geometrytype: 'Point', crs: { epsg: 'EPSG:3857' },
        fields: ['name', 'kind', 'tags'].map(name => ({ name, label: name, type: 'varchar', show: true })),
        ...config,
      });
      window.tableView = await mountFormComponent(coreTestExports.Table, { layerId: 'roads' });
      await coreTestExports.waitFor(() => tableView.state.features.length === 12 && !g3w.state.content.loading, 2000);
      return tableView;
    };
    window.tablePageSize = async size => {
      const select = tableView.$el.querySelector('.table-toolbar select');
      select.value = `${size}`;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await coreTestExports.waitFor(() => tableView.search.page_size === size && tableView.state.features.length === Math.min(size, 12) && !g3w.state.content.loading, 2000);
      await Vue.nextTick();
    };
  });
});

After({ tags: '@attribute-tables' }, async function () {
  await this.corePage.evaluate(async () => {
    if (window.tableView && !tableView._isDestroyed) tableView.$destroy();
    await new Promise(resolve => setTimeout(resolve, 0));
    tableMap.dispose();
  });
  if (!this.tableExpectedWarning) assert.deepEqual(this.tableWarnings, [], 'table workflows must not hide failed requests or source warnings');
});

Then('an attribute table presents its fields totals and metadata control', async function () {
  const result = await this.corePage.evaluate(async () => {
    const view = await mountTable();
    const header = document.querySelector('#g3w-content header');
    header.querySelector('button').click();
    await coreTestExports.waitFor(() => tableEffects.metadata === 1, 1000);
    return {
      content: tableEffects.content, total: view.state.allfeatures, pages: view.pages,
      rows: view.$el.querySelectorAll('tbody tr').length,
      tags: view.$el.querySelector('tbody tr').textContent.includes('A,B'),
      info: header.textContent.includes('12'), search: !!header.querySelector('input[type="search"]'),
      metadata: document.querySelector('#modal-metadata').open, disabled: g3w.state.content.disabled,
    };
  });
  assert.deepEqual(result, {
    content: [{ id: 'openattributetable', title: 'Roads', split: 'v', push: false }],
    total: 12, pages: 1, rows: 12, tags: true, info: true, search: true, metadata: true, disabled: false,
  });
});

Then('attribute table sorting and text search update their requests and rows', async function () {
  await this.corePage.evaluate(async () => {
    await mountTable();
    tableView.$el.querySelector('thead tr').children[1].click();
    await coreTestExports.waitFor(() => tableView.state.features[0].attributes.name === 'Road12', 2000);
    tableView.$el.querySelector('thead tr').children[2].click();
    await coreTestExports.waitFor(() => tableView.search.ordering === 'kind' && !g3w.state.content.loading, 2000);
    tableView.$el.querySelector('thead tr').children[1].click();
    await coreTestExports.waitFor(() => tableView.search.ordering === 'name' && !g3w.state.content.loading, 2000);
    const search = document.querySelector('#g3w-content input[type="search"]');
    search.value = 'Road11';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await coreTestExports.waitFor(() => tableView.state.features.length === 1, 2000);
  });
  const result = await this.corePage.evaluate(() => ({
    ids: tableView.state.features.map(feature => feature.id), ordering: tableView.ordering,
    count: tableView.state.allfeatures, searching: tableView.search.search,
  }));
  assert.deepEqual(result, { ids: [11], ordering: [0, 'asc'], count: 1, searching: 'Road11' });
  assert.ok(this.tableRequests.some(request => request.ordering === '-name'));
  assert.ok(this.tableRequests.some(request => request.ordering === 'kind'));
  assert.equal(this.tableRequests.at(-1).ordering, 'name');
  assert.equal(this.tableRequests.at(-1).search, 'Road11');
});

Then('attribute table column filters and pagination preserve their request parameters', async function () {
  await this.corePage.evaluate(async () => {
    await mountTable();
    await tablePageSize(10);
    tableView.$el.querySelector('button[title="Forward"]').click();
    await coreTestExports.waitFor(() => tableView.state.features[0]?.id === 11, 2000);
    const inputs = tableView.$el.querySelectorAll('.column-search');
    inputs[0].value = 'Road0';
    inputs[0].dispatchEvent(new KeyboardEvent('keyup', { key: '0', bubbles: true }));
    await coreTestExports.waitFor(() => tableView.search.field === 'name|ilike|Road0', 2000);
    inputs[1].value = 'local';
    inputs[1].dispatchEvent(new KeyboardEvent('keyup', { key: 'l', bubbles: true }));
    await coreTestExports.waitFor(() => tableView.state.allfeatures === 5 && !g3w.state.content.loading, 2000);
  });
  const result = await this.corePage.evaluate(() => ({
    ids: tableView.state.features.map(feature => feature.id), page: tableView.search.page, size: tableView.search.page_size,
    count: tableView.state.allfeatures, pages: tableView.pages, filter: tableView.search.field,
  }));
  assert.deepEqual(result, { ids: [1, 3, 5, 7, 9], page: 1, size: 10, count: 5, pages: 1, filter: 'name|ilike|Road0|AND,kind|ilike|local' });
  assert.ok(this.tableRequests.some(request => request.page === 2 && request.page_size === 10));
  assert.equal(this.tableRequests.at(-1).field, result.filter);
});

Then('attribute table selection updates real layer selections across pages', async function () {
  const result = await this.corePage.evaluate(async () => {
    await mountTable();
    await tablePageSize(10);
    tableView.$el.querySelector('tbody input[type="checkbox"]').click();
    await Vue.nextTick();
    const one = tableLayer.isSelected(1);
    tableView.$el.querySelector('thead input[type="checkbox"]').click();
    await coreTestExports.waitFor(() => tableView.all && !g3w.state.content.loading, 2000);
    const selected = Array.from(tableLayer.state.selection.fids).sort((a, b) => a - b);
    const drawn = g3w.app.defaultsLayers.selectionLayer.getSource().getFeatures().length;
    tableView.$el.querySelector('button[title="Invert Selection"]').click();
    await coreTestExports.waitFor(() => !tableView.all && !g3w.state.content.loading, 2000);
    const inverse = { selected: tableView.state.features.some(feature => feature.selected), last: tableLayer.isSelected(12) };
    await tableLayer.clearSelectionFids();
    return { one, selected, drawn, inverse, cleared: tableLayer.state.selection.fids.size, active: tableView.state.selection.active };
  });
  assert.deepEqual(result, {
    one: true, selected: Array.from({ length: 12 }, (_, index) => index + 1), drawn: 12,
    inverse: { selected: false, last: false }, cleared: 0, active: false,
  });
});

Then('attribute table actions preserve feature identity and plugin conditions', async function () {
  const result = await this.corePage.evaluate(async () => {
    const calls = [];
    g3w.app.onbefore('addActionsForLayers', actions => {
      actions.roads.push({
        id: 'custom', hint: 'Custom action', condition: ({ feature }) => feature.id === 1,
        cbk: (layer, feature) => calls.push({ layer: layer.id, id: feature.id }),
      });
    });
    const view = await mountTable();
    const custom = view.$el.querySelectorAll('tbody i[title="Custom action"]');
    custom[0].click();
    view.$el.querySelector('tbody i[title="Form View"]').click();
    await coreTestExports.waitFor(() => tableEffects.extents.length === 1, 2000);
    return {
      custom: custom.length, calls, extents: tableEffects.extents,
      ids: tableEffects.data[0].data[0].features.map(feature => feature.getId()),
    };
  });
  assert.deepEqual(result, { custom: 1, calls: [{ layer: 'roads', id: 1 }], extents: [[1, 2, 1, 2]], ids: [1] });
  assert.ok(this.tableRequests.some(request => request.fids === '1' && request.formatter === '1'));
});

Then('related nonspatial table actions open their configured relation', async function () {
  this.tableNoGeometry = true;
  const result = await this.corePage.evaluate(async () => {
    fixtureRelations.push({
      id: 'parent', name: 'Road', referencedLayer: 'parents', referencingLayer: 'roads',
      fieldRef: { referencedField: 'id', referencingField: 'road_id' }, type: 'MANY',
    });
    createFixtureLayer({ id: 'parents', geometrytype: 'Point', crs: { epsg: 'EPSG:3857' } });
    const view = await mountTable({ geometrytype: 'NoGeometry' });
    view.$el.querySelector('tbody i[title="Show Relations"]').click();
    view.$el.querySelector('tbody i[title="Form View"]').click();
    await coreTestExports.waitFor(() => tableEffects.data.length === 1, 2000);
    return {
      relations: view.relations.map(relation => ({ id: relation.layer.getId(), father: relation.father_fields, child: relation.fields })),
      opened: tableEffects.relations, extents: tableEffects.extents,
      ids: tableEffects.data[0].data[0].features.map(feature => feature.getId()),
    };
  });
  assert.deepEqual(result, {
    relations: [{ id: 'parents', father: ['id'], child: ['road_id'] }],
    opened: [{ id: 1, layer: 'roads', push: false }], extents: [], ids: [1],
  });
  assert.ok(this.tableRequests.some(request => request.fids === '1' && request.formatter === '1'));
});

Then('attribute tables follow the map only while their bounding box control is enabled', async function () {
  const result = await this.corePage.evaluate(async () => {
    await mountTable();
    const button = tableView.$el.querySelector('button[title="Update results when map moves"]');
    button.click();
    await coreTestExports.waitFor(() => tableView.search.in_bbox && !g3w.state.content.loading, 2000);
    const first = tableView.search.in_bbox;
    tableMap.getView().setCenter([100, 200]);
    tableMap.dispatchEvent('moveend');
    await coreTestExports.waitFor(() => tableView.search.in_bbox !== first && !g3w.state.content.loading, 2000);
    const moved = tableView.search.in_bbox;
    button.click();
    await coreTestExports.waitFor(() => !tableView.search.in_bbox && !g3w.state.content.loading, 2000);
    const previous = tableView.search;
    tableMap.dispatchEvent('moveend');
    await Vue.nextTick();
    const row = tableView.$el.querySelector('tbody tr');
    row.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    row.click();
    return {
      changed: moved !== first, unsubscribed: tableView.onMoveEnd === null && tableView.search === previous,
      bbox: tableView.state.geolayer.active,
      highlights: tableEffects.highlights.filter(effect => effect.geometry).map(effect => ({ geometry: effect.geometry, zoom: effect.zoom })),
    };
  });
  assert.deepEqual(result, {
    changed: true, unsubscribed: true, bbox: false,
    highlights: [
      { geometry: { type: 'Point', coordinates: [1, 2] }, zoom: false },
      { geometry: { type: 'Point', coordinates: [1, 2] }, zoom: true },
    ],
  });
  assert.ok(this.tableRequests.filter(request => request.in_bbox).length >= 2);
  assert.equal(Object.hasOwn(this.tableRequests.at(-1), 'in_bbox'), false);
});

Then('a full-size attribute table closes with {string} highlight work', async function (pending) {
  const result = await this.corePage.evaluate(async pending => {
    await mountTable();
    g3w.app.emit('onbefore:setContent', { perc: 100 });
    if (pending) {
      tableView.$el.querySelector('tbody tr').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    }
    const deferred = tableEffects.highlights.filter(effect => effect.geometry).length;
    tableView.$destroy();
    await new Promise(resolve => setTimeout(resolve, 0));
    tableLayer.emit('filtertokenchange');
    tableLayer.emit('unselectionall');
    return {
      deferred, destroyed: tableView._isDestroyed, hasMap: tableView.has_map,
      headers: document.querySelectorAll('#g3w-content header input, #g3w-content header button').length,
      highlights: tableEffects.highlights.filter(effect => effect.geometry).map(effect => effect.geometry),
      actions: Object.keys(g3w.state.layersactions),
    };
  }, pending === 'pending');
  assert.deepEqual(result, {
    deferred: 0, destroyed: true, hasMap: true, headers: 0,
    highlights: pending === 'pending' ? [{ type: 'Point', coordinates: [1, 2] }] : [], actions: [],
  });
  assert.equal(this.tableRequests.length, 1);
});

Then('attribute table failures notify the user and permit a successful retry', async function () {
  await this.corePage.evaluate(async () => { await mountTable(); });
  this.tableExpectedWarning = true;
  const failure = route => route.fulfill({ status: 500, json: { error: 'Offline fixture failure' } });
  await this.corePage.route('**/vector/data/**', failure);
  const failed = await this.corePage.evaluate(async () => {
    await tableView.reload();
    return {
      rows: tableView.state.features.length, disabled: g3w.state.content.disabled,
      loading: g3w.state.content.loading, messages: tableEffects.messages,
    };
  });
  assert.deepEqual(failed, {
    rows: 12, disabled: false, loading: false,
    messages: [{ type: 'alert', message: 'Server connection error' }],
  });
  assert.ok(this.tableWarnings.length > 0);
  await this.corePage.unroute('**/vector/data/**', failure);
  const retried = await this.corePage.evaluate(async () => {
    await tableView.reload();
    return { rows: tableView.state.features.length, disabled: g3w.state.content.disabled, loading: g3w.state.content.loading };
  });
  assert.deepEqual(retried, { rows: 12, disabled: false, loading: false });
});
