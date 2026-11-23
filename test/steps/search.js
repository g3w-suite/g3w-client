const assert = require('node:assert/strict');
const { After, Before, Then } = require('@cucumber/cucumber');

Before({ tags: '@search-workflows' }, async function () {
  this.searchRequests = [];
  this.searchWarnings = [];
  this.corePage.on('console', message => {
    if (['warning', 'error'].includes(message.type())) this.searchWarnings.push(message.text());
  });
  await this.corePage.route('**/vector/data/**', route => {
    const data = route.request().postDataJSON();
    this.searchRequests.push({ ...data, url: new URL(route.request().url()).pathname });
    if (data.fformatter) {
      const choices = {
        zone: [['North & East', 'North'], ['South', 'South']],
        street: data.field?.includes('South') ? [['S1', 'South road']] : [['N1', 'Main road'], ['N2', 'Side road']],
        name: data.suggest?.endsWith('empty') ? [] : [['road1', 'Main road'], ['road2', 'Side road']],
      };
      return route.fulfill({ json: { result: true, data: choices[data.fformatter] || [] } });
    }
    return route.fulfill({ json: { result: true, vector: { count: 25, data: {
      type: 'FeatureCollection', features: [{
        type: 'Feature', id: 1, properties: { name: 'Main & Side', parent: 7, district: 'North' },
        geometry: { type: 'Point', coordinates: [12, 45] },
      }],
    } } } });
  });
  await this.corePage.evaluate(() => {
    Vue.mixin({ methods: { isMobile: () => g3w.state.ismobile } });
    window.searchPanels = [];
    window.searchEffects = { shown: [], results: [], zooms: [], messages: [], closed: 0, hidden: 0 };
    window.searchMap = new ol.Map({ layers: [], controls: [], interactions: [], view: new ol.View({ center: [0, 0], zoom: 2 }) });
    searchMap.setSize([256, 256]);
    g3w.app.getMap = () => searchMap;
    g3w.app.showData = async (data, options) => searchEffects.results.push({ data, options });
    g3w.app.zoomToFeatures = features => searchEffects.zooms.push(features.map(feature => feature.getId()));
    g3w.app.closeContent = async () => { searchEffects.closed++; };
    g3w.app.hideSidebar = () => { searchEffects.hidden++; };
    g3w.app.showUserMessage = message => searchEffects.messages.push(message);
    g3w.app.showPanel = panel => { searchPanels.push(panel); searchEffects.shown.push(panel); };
    Object.assign(g3w.state.project.state, { layerstree: [{ id: 'roads' }], autozoom_query: true, layers_url: '/admin/layers/' });
    g3w.state.project.getRelationById = id => fixtureRelations.find(relation => relation.id === id);
    window.searchLayer = createFixtureLayer({
      id: 'roads', name: 'roads', fields: [{ name: 'name', type: 'varchar', show: true }],
    });
    window.searchField = (attribute, type = 'textfield', options = {}, op = 'eq') => ({
      id: attribute, attribute, label: attribute, op, logicop: 'AND', input: { type, options },
    });
    window.mountSearch = async (filter, options = {}, extra = {}) => {
      const panel = coreTestExports.createSearchPanel({
        id: 'road-search', name: 'Find roads', ...extra,
        options: { layerid: 'roads', filter, ...options },
      });
      searchPanels.push(panel);
      window.searchPanel = panel;
      window.searchService = panel.getService();
      await searchService.state.mounted;
      await panel.mount('#fixture');
      window.searchView = panel.getInternalPanel();
      await Vue.nextTick();
      await Vue.nextTick();
      return searchView;
    };
    window.searchChoice = async (id, value) => {
      const select = searchView.$el.querySelector(`x-select[data-input-id="${id}"]`);
      const option = Array.from(select.container.querySelectorAll('x-option')).find(option => option.value === value);
      if (!option) throw new Error(`Missing search option ${id}: ${value}`);
      select.select(option);
      await Vue.nextTick();
      await coreTestExports.waitFor(() => !searchService.state.searching && !searchService.state.forminputs.some(input => input.loading), 2000);
    };
    window.searchTerm = term => {
      const select = searchView.$el.querySelector('x-select');
      select.input.value = term;
      select.input.dispatchEvent(new Event('input', { bubbles: true }));
    };
  });
});

After({ tags: '@search-workflows' }, async function () {
  await this.corePage.evaluate(async () => {
    for (const panel of new Set(searchPanels)) {
      if (panel.getInternalPanel()) await panel.unmount();
    }
    searchMap.dispose();
  });
  assert.deepEqual(this.searchWarnings, [], 'search workflows must not hide failed requests or source warnings');
});

Then('configured search inputs load their choices and warn about missing layers', async function () {
  const result = await this.corePage.evaluate(async () => {
    g3w.state.project.state.layerstree.push({ id: 'deleted' });
    const view = await mountSearch([
      searchField('zone', 'selectfield'),
      searchField('street', 'selectfield', { dependance: 'zone', dependance_strict: true }),
      searchField('kind', 'selectfield', { values: [{ key: 'Public', value: 'public' }] }),
      searchField('name', 'autocompletefield', { numdigaut: 3 }),
    ], { otherquerylayerids: ['deleted'] });
    return {
      layers: searchService.state.search_layers.map(layer => layer.getId()),
      inputs: searchService.state.forminputs.map(input => ({
        name: input.attribute, values: input.values, value: input.value, disabled: !!input.disabled, loading: input.loading,
      })),
      loading: view.loading, title: view.$el.querySelector('h4').textContent,
      admin: view.$el.querySelector('a').getAttribute('href'),
      warning: searchEffects.messages.map(message => ({ type: message.type, missing: message.message.includes('Invalid <code>search_layers</code>') })),
    };
  });
  assert.deepEqual(result, {
    layers: ['roads'], inputs: [
      { name: 'zone', values: [{ key: '__G3W_ALL__', value: '__G3W_ALL__' }, { key: 'North', value: 'North & East' }, { key: 'South', value: 'South' }], value: '__G3W_ALL__', disabled: false, loading: false },
      { name: 'street', values: [{ key: '__G3W_ALL__', value: '__G3W_ALL__' }], value: '__G3W_ALL__', disabled: true, loading: false },
      { name: 'kind', values: [{ key: '__G3W_ALL__', value: '__G3W_ALL__' }, { key: 'Public', value: 'public' }], value: '__G3W_ALL__', disabled: false, loading: false },
      { name: 'name', values: [], value: null, disabled: false, loading: false },
    ], loading: false, title: 'Find roads', admin: '/admin/layers/',
    warning: [{ type: 'warning', missing: true }],
  });
  assert.deepEqual(this.searchRequests.map(request => request.fformatter), ['zone']);
});

Then('dependent search choices follow their parent and reuse cached responses', async function () {
  const result = await this.corePage.evaluate(async () => {
    await mountSearch([
      searchField('zone', 'selectfield'),
      searchField('street', 'selectfield', { dependance: 'zone', dependance_strict: true }),
      searchField('name', 'autocompletefield', { dependance: 'street', dependance_strict: true }),
    ]);
    const [, street, name] = searchService.state.forminputs;
    await searchChoice('zone', 'North & East');
    await coreTestExports.waitFor(() => street.values.length === 3, 2000);
    const north = street.values.map(option => option.value);
    await searchChoice('street', 'N1');
    const enabled = !name.disabled;
    await searchChoice('zone', 'South');
    await coreTestExports.waitFor(() => street.values.some(option => option.value === 'S1'), 2000);
    const reset = { value: name.value, disabled: name.disabled };
    await searchChoice('zone', 'North & East');
    const cached = street.values.map(option => option.value);
    await searchChoice('zone', searchView.allvalue);
    return { north, enabled, reset, cached, disabled: street.disabled, empty: street.value, cache: Object.keys(street.dvalues).sort() };
  });
  assert.deepEqual(result, {
    north: ['__G3W_ALL__', 'N1', 'N2'], enabled: true, reset: { value: null, disabled: true },
    cached: ['__G3W_ALL__', 'N1', 'N2'], disabled: true, empty: '__G3W_ALL__',
    cache: ['zone|eq|North%20%26%20East', 'zone|eq|South'],
  });
  assert.deepEqual(this.searchRequests.filter(request => request.fformatter === 'street').map(request => request.field),
    ['zone|eq|North%20%26%20East', 'zone|eq|South']);
});

Then('multiple search selections produce an encoded filter and restore all values', async function () {
  const result = await this.corePage.evaluate(async () => {
    await mountSearch([
      searchField('kind', 'selectfield', { values: ['A & B', 'Side', { key: 'Empty', value: null }] }, 'in'),
      searchField('name', 'autocompletefield', { dependance: 'kind', dependance_strict: true }),
    ]);
    const input = searchService.state.forminputs[0];
    await searchChoice('kind', 'A & B');
    await searchChoice('kind', 'Side');
    const selected = [...input.value];
    const filter = searchService.createFilter();
    const dependentEnabled = !searchService.state.forminputs[1].disabled;
    await searchChoice('kind', searchView.allvalue);
    const all = [...input.value];
    const dependentDisabled = searchService.state.forminputs[1].disabled;
    await searchChoice('kind', 'null');
    return { selected, filter, all, dependentEnabled, dependentDisabled, nullValue: [...input.value], nullFilter: searchService.createFilter() };
  });
  assert.deepEqual(result, {
    selected: ['A & B', 'Side'], filter: ['kind|in|(A%20%26%20B,Side)'], all: ['__G3W_ALL__'],
    dependentEnabled: true, dependentDisabled: true,
    nullValue: ['null'], nullFilter: ['kind|in|(null)'],
  });
});

Then('a {string} search submits the form and presents local features', async function (pagination) {
  await this.corePage.evaluate(async paginate => {
    await mountSearch([searchField('name')], { paginate });
    const input = searchView.$el.querySelector('input[type="text"]');
    input.value = 'Main & Side';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const checkbox = searchView.$el.querySelector('input[type="checkbox"]');
    checkbox.click();
    searchView.$el.querySelector('#dosearch').click();
  }, pagination === 'paginated');
  await this.corePage.waitForFunction(() => searchEffects.results.length === 1 && !searchService.state.searching);
  const result = await this.corePage.evaluate(() => ({
    ids: searchEffects.results[0].data.data[0].features.map(feature => feature.getId()),
    title: searchEffects.results[0].options.title,
    search: searchEffects.results[0].data.query.search,
    pagination: !!searchEffects.results[0].data.query.pagination,
    zooms: searchEffects.zooms, autofilter: searchService.state.autofilter.value,
  }));
  assert.deepEqual(result, {
    ids: [1], title: 'Find roads', search: ['name|eq|Main%20%26%20Side'],
    pagination: pagination === 'paginated', zooms: pagination === 'paginated' ? [] : [[1]], autofilter: 1,
  });
  assert.equal(this.searchRequests.length, 1);
  assert.equal(this.searchRequests[0].field, 'name|eq|Main%20%26%20Side');
  assert.equal(this.searchRequests[0].autofilter, 1);
  assert.equal(this.searchRequests[0].page, pagination === 'paginated' ? 1 : undefined);
});

Then('search autocomplete enforces its minimum and retains selected options', async function () {
  await this.corePage.evaluate(async () => {
    await mountSearch([searchField('name', 'autocompletefield', { numdigaut: 3 })]);
    searchTerm('ab');
  });
  await this.corePage.waitForTimeout(550);
  assert.equal(this.searchRequests.length, 0);
  await this.corePage.evaluate(() => searchTerm('road'));
  await this.corePage.waitForFunction(() => searchService.state.forminputs[0].values.length === 2);
  await this.corePage.evaluate(async () => {
    await searchChoice('name', 'road1');
    searchTerm('empty');
  });
  await this.corePage.waitForFunction(() => searchView.$el.querySelector('.search-select-status').textContent === g3w.gettext('No results'));
  const retained = await this.corePage.evaluate(() => {
    const status = searchView.$el.querySelector('.search-select-status');
    return { values: searchService.state.forminputs[0].values, visible: !status.hidden, value: searchService.state.forminputs[0].value };
  });
  assert.deepEqual(retained, { values: [{ key: 'Main road', value: 'road1' }], visible: true, value: 'road1' });
  const reset = await this.corePage.evaluate(async () => {
    const select = searchView.$el.querySelector('x-select');
    select.trigger.click();
    const status = select.container.querySelector('.search-select-status').textContent;
    searchView.$el.querySelector('.search-select-clear').click();
    await Vue.nextTick();
    return { status, value: searchService.state.forminputs[0].value, clearButton: !!searchView.$el.querySelector('.search-select-clear') };
  });
  assert.equal(reset.status, 'Please enter 3 or more characters');
  assert.equal(reset.value, '__G3W_ALL__');
  assert.equal(reset.clearButton, false);
  assert.deepEqual(this.searchRequests.map(request => request.suggest), ['name|road', 'name|empty']);
});

Then('search autocomplete ignores stale responses and cancels pending work on close', async function () {
  let release;
  await this.corePage.route('**/vector/data/**', async route => {
    const { suggest } = route.request().postDataJSON();
    this.searchRequests.push(suggest);
    if (suggest === 'name|older') await new Promise(resolve => { release = resolve; });
    await route.fulfill({ json: { result: true, data: [[suggest, suggest]] } });
  });
  try {
    await this.corePage.evaluate(async () => {
      await mountSearch([searchField('name', 'autocompletefield')]);
      searchTerm('older');
    });
    await this.corePage.waitForRequest(request => request.postData()?.includes('name|older'));
    await this.corePage.evaluate(() => searchTerm('newer'));
    await this.corePage.waitForFunction(() => searchService.state.forminputs[0].values[0]?.value === 'name|newer');
    release();
    const older = await this.corePage.waitForResponse(response => response.request().postData()?.includes('name|older'));
    await older.finished();
    const result = await this.corePage.evaluate(async () => {
      await new Promise(requestAnimationFrame);
      await Vue.nextTick();
      const values = searchService.state.forminputs[0].values.map(option => option.value);
      searchTerm('cancelled');
      await searchPanel.unmount();
      return { values, cleared: searchService.state === null };
    });
    await this.corePage.waitForTimeout(550);
    assert.deepEqual(result, { values: ['name|newer'], cleared: true });
    assert.deepEqual(this.searchRequests, ['name|older', 'name|newer']);
  } finally {
    release?.();
  }
});

Then('removing a search filter clears its token and unsubscribes on close', async function () {
  const deletes = [];
  await this.corePage.route('**/vector/filtertoken/**', route => {
    deletes.push(new URL(route.request().url()).searchParams.get('mode'));
    return route.fulfill({ json: { result: true, data: {} } });
  });
  const result = await this.corePage.evaluate(async () => {
    searchLayer.state.filter.active = true;
    searchLayer.state.selection.active = true;
    searchLayer.state.selection.fids.add(1);
    g3w.state.tokens.filtertoken = 'active-filter';
    await mountSearch([searchField('zone', 'selectfield'), searchField('name')]);
    searchService.state.forminputs[1].value = 'Main';
    const help = !!searchView.$el.querySelector('#g3w-search-filter-layers');
    searchView.$el.querySelector('button[title="Remove Filter"]').click();
    await coreTestExports.waitFor(() => !searchLayer.getToken() && !searchView.reload, 2000);
    await Vue.nextTick();
    const values = searchService.state.forminputs.map(input => input.value);
    const cleared = { selection: searchLayer.state.selection.fids.size, active: searchLayer.state.filter.active };
    const closeCount = searchEffects.closed;
    await searchPanel.unmount();
    searchLayer.emit('filtertokenchange');
    g3w.app.emit('resize');
    return { help, values, cleared, closeCount, serviceCleared: searchService.state === null };
  });
  assert.deepEqual(result, {
    help: true, values: ['__G3W_ALL__', null], cleared: { selection: 0, active: false }, closeCount: 1, serviceCleared: true,
  });
  assert.deepEqual(deletes, ['delete']);
  assert.equal(this.searchRequests.length, 2);
});

Then('mobile search dates and focus use the configured display and storage formats', async function () {
  const result = await this.corePage.evaluate(async () => {
    g3w.state.ismobile = true;
    window.orientation = 0;
    const sidebar = document.createElement('aside');
    sidebar.className = 'main-sidebar';
    sidebar.style.cssText = 'height:100px; overflow:auto; position:relative';
    document.body.append(sidebar);
    sidebar.append(document.querySelector('#fixture'));
    await mountSearch([
      searchField('created', 'datetimefield', { format: { fieldformat: 'yyyy-MM-dd', displayformat: 'dd/MM/yyyy', time: false } }),
      searchField('name'),
    ]);
    const field = $(searchView.$refs.date_created);
    field.data('DateTimePicker').date(moment('2024-03-27', 'YYYY-MM-DD'));
    await Vue.nextTick();
    const stored = searchService.state.forminputs[0].value;
    const displayed = document.getElementById('created').value;
    field.data('DateTimePicker').date(null);
    await Vue.nextTick();
    searchView.$el.style.paddingTop = '200px';
    const input = document.getElementById('name');
    const top = $(input).position().top - 10;
    input.focus();
    await coreTestExports.waitFor(() => sidebar.scrollTop > 0, 2000);
    searchMap.setSize([0, 0]);
    searchView.$el.querySelector('#dosearch').click();
    await coreTestExports.waitFor(() => searchEffects.results.length === 1, 2000);
    return {
      stored, displayed, cleared: searchService.state.forminputs[0].value,
      scroll: sidebar.scrollTop, top, hidden: searchEffects.hidden,
    };
  });
  assert.equal(result.stored, '2024-03-27');
  assert.equal(result.displayed, '27/03/2024');
  assert.equal(result.cleared, null);
  assert.ok(result.top > 0);
  assert.equal(result.scroll, result.top);
  assert.equal(result.hidden, 1);
});

Then('a {string} related search filters its parent layer using child results', async function (key) {
  const result = await this.corePage.evaluate(async composite => {
    createFixtureLayer({ id: 'parents', name: 'parents', fields: [{ name: 'name', type: 'varchar', show: true }] });
    g3w.state.project.state.layerstree.push({ id: 'parents' });
    fixtureRelations.push({
      id: 'ownership', referencedLayer: 'parents',
      fieldRef: composite
        ? { referencedField: ['id', 'district'], referencingField: ['parent', 'district'] }
        : { referencedField: 'id', referencingField: 'parent' },
    });
    await mountSearch([searchField('name')], { search_1n_relationid: 'ownership' }, { type: 'search_1n' });
    searchService.state.forminputs[0].value = 'Main';
    const data = await searchService.doSearch({ state: searchService.state });
    return { ids: data.data[0].features.map(feature => feature.getId()), shown: searchEffects.results.length, searching: searchService.state.searching };
  }, key === 'composite');
  assert.deepEqual(result, { ids: [1], shown: 1, searching: false });
  assert.equal(this.searchRequests.length, 2);
  assert.equal(this.searchRequests[0].field, 'name|eq|Main');
  assert.equal(this.searchRequests[1].field, key === 'composite' ? 'id|eq|7|AND,district|eq|North' : 'id|eq|7');
  assert.ok(this.searchRequests[1].url.includes('parents'));
});

Then('a related search with no child features presents an empty result', async function () {
  await this.corePage.route('**/vector/data/**', route => route.fulfill({
    json: { result: true, vector: { count: 0, data: { type: 'FeatureCollection', features: [] } } },
  }));
  const result = await this.corePage.evaluate(async () => {
    await mountSearch([searchField('name')], { search_1n_relationid: 'missing' }, { type: 'search_1n' });
    const data = await searchService.doSearch({ state: searchService.state });
    return { data, shown: searchEffects.results.map(result => result.data), searching: searchService.state.searching };
  });
  assert.deepEqual(result, { data: [], shown: [{ data: [] }], searching: false });
});

Then('a follow-up search response {string} is presented correctly', async function (response) {
  await this.corePage.route('**/vector/data/**', route => route.fulfill({ json: response === 'form'
    ? { id: 'follow-up', name: 'Follow-up search', options: { layerid: 'roads', filter: [] } }
    : {} }));
  const result = await this.corePage.evaluate(async () => {
    await mountSearch([searchField('name')], { return: 'search' });
    searchService.state.forminputs[0].value = 'Main';
    await searchService.doSearch({ state: searchService.state });
    return {
      child: searchEffects.shown.map(panel => ({ id: panel.getId(), child: panel.getService().state.child })),
      closed: searchEffects.closed, empty: searchEffects.results.map(result => result.data),
      searching: searchService.state.searching,
    };
  });
  assert.deepEqual(result, {
    child: response === 'form' ? [{ id: 'follow-up', child: true }] : [], closed: 1,
    empty: response === 'form' ? [] : [{ data: [] }], searching: false,
  });
});
