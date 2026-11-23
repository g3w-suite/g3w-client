const assert = require('node:assert/strict');
const { After, Before, Then } = require('@cucumber/cucumber');

Before({ tags: '@relation-workflows' }, async function () {
  this.relationRequests = [];
  this.relationDataFailure = false;
  this.relationDownloadFailure = false;
  this.relationExpectedWarnings = 0;
  await this.corePage.route('**/vector/data/**', route => {
    const url = new URL(route.request().url());
    const params = route.request().postDataJSON();
    this.relationRequests.push({ params, relation: url.searchParams.get('relationonetomany') });
    if (this.relationDataFailure) return route.fulfill({ status: 500, contentType: 'text/plain', body: 'Unavailable' });
    let features = Array.from({ length: 12 }, (_, index) => ({
      type: 'Feature', id: index + 1,
      properties: { name: `Entry${String(index + 1).padStart(2, '0')}`, value: index + 1 },
      geometry: { type: 'Point', coordinates: [index + 1, index + 2] },
    }));
    if (params.field) {
      for (const expression of params.field.split('|AND,')) {
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
  await this.corePage.route('**/relations/export/**', route => this.relationDownloadFailure
    ? route.fulfill({ status: 500, json: { message: 'Relation export failed' } })
    : route.fulfill({ contentType: 'text/csv', headers: { 'Content-Disposition': 'attachment; filename=related.csv' }, body: 'name,value\nEntry01,1\n' }));
  await this.corePage.evaluate(async () => {
    g3w.gettext.register('en', (await import('/static/client/locales/en.js')).default);
    Vue.prototype.$fa = name => `icon-${name}`;
    window.relationEffects = { views: [], options: [], zooms: [], charts: [], hidden: [], messages: [], actions: [], resized: 0 };
    window.relationWarnings = [];
    console.warn = (...args) => relationWarnings.push(args.map(String).join(' '));
    document.body.insertAdjacentHTML('beforeend', '<section id="g3w-content" style="width:800px"></section>');
    document.querySelector('#g3w-content').append(document.querySelector('#fixture'));
    createFixtureLayer({
      id: 'parents', name: 'Parents', fields: [
        { name: 'name', label: 'Name', type: 'varchar', show: true },
        { name: 'code', label: 'Code', type: 'integer', show: true },
        { name: 'path', label: 'Path', type: 'varchar', show: true },
        { name: 'extra', label: 'Extra', type: 'varchar', show: true },
      ],
    });
    window.relationChild = createFixtureLayer({
      id: 'children', name: 'Children', geometrytype: 'Point', crs: { epsg: 'EPSG:3857' },
      fields: [
        { name: 'name', label: 'Name', type: 'varchar', show: true },
        { name: 'value', label: 'Value', type: 'integer', show: true },
      ],
      download: true, download_csv: true,
      editor_form_structure: [{ name: 'Details', nodes: [{ name: 'name', type: 'field' }, { name: 'value', type: 'field' }] }],
    });
    relationChild.setAttributeTablePageLength(10);
    relationChild.setUrl({ type: 'csv', url: '/relations/export/csv' });
    fixtureRelations.push(
      { id: 'children', name: 'Children', type: 'MANY', referencedLayer: 'parents', referencingLayer: 'children' },
      { id: 'zebra', name: 'Zebra', type: 'MANY', referencedLayer: 'parents', referencingLayer: 'children' },
      { id: 'single', name: 'Single', type: 'ONE', referencedLayer: 'parents', referencingLayer: 'children' },
    );
    g3w.state.project.getRelationById = id => fixtureRelations.find(relation => relation.id === id);
    g3w.state.project.getPrint = () => [];
    g3w.state.project.state.layerstree = [{ id: 'parents' }, { id: 'children' }];
    window.relationParent = {
      id: 17, attributes: { [g3w.constants.G3W_FID]: 17, name: 'Parent', code: 0, path: '/private/image.png', extra: 'Visible' },
    };
    g3w.app.setContent = async options => {
      const view = options.content.internalComponent;
      relationEffects.options.push({ title: options.title, push: options.push });
      relationEffects.views.push(view);
      view.$mount();
      document.querySelector('#fixture').append(view.$el);
      await Vue.nextTick();
    };
    g3w.app.zoomToExtent = (extent, options) => relationEffects.zooms.push({ extent, highlight: options.highlight, type: options.highLightGeometry.getType() });
    g3w.app.showChart = (ids, container, options) => relationEffects.charts.push({ ids, container, options });
    g3w.app.hideChart = container => relationEffects.hidden.push(container);
    g3w.app.showUserMessage = message => relationEffects.messages.push(message);
    g3w.app.on('resize', () => { relationEffects.resized++; });
    g3w.app.onbefore('addActionsForLayers', actions => {
      if (actions.children) actions.children.push({
        id: 'plugin', hint: 'Plugin action', class: 'plugin-action',
        condition: ({ feature }) => feature.id === 1,
        cbk: (layer, feature) => relationEffects.actions.push({ layer: layer.id, feature: feature.id }),
      });
    });
    window.openRelation = async (relationId = 'children') => {
      g3w.app.showRelations({ layerId: 'parents', relationId, feature: relationParent });
      window.relationView = relationEffects.views.at(-1);
      await Vue.nextTick();
      if (relationId) await coreTestExports.waitFor(() => relationView.table.features.length && !g3w.state.content.loading, 2000);
      await Vue.nextTick();
      return relationView;
    };
  });
});

After({ tags: '@relation-workflows' }, async function () {
  await this.corePage.evaluate(async () => {
    for (const view of relationEffects.views) if (!view._isDestroyed) view.$destroy();
    await Vue.nextTick();
  });
  const warnings = await this.corePage.evaluate(() => relationWarnings);
  assert.equal(warnings.length, this.relationExpectedWarnings, warnings.join('\n'));
});

Then('the relation menu opens its selected relation through the real application', async function () {
  const result = await this.corePage.evaluate(async () => {
    const menu = await openRelation(null);
    const names = menu.relations.map(relation => relation.name);
    const info = menu.feature_info();
    g3w.app.plotLayerIds = ['children'];
    const chartLayers = [...new Set(menu.charts)];
    menu.$el.querySelector('button').click();
    await coreTestExports.waitFor(() => relationEffects.views.at(-1).table.features.length && !g3w.state.content.loading, 2000);
    return { names, info, chartLayers, title: relationEffects.options.at(-1).title, rows: relationEffects.views.at(-1).table.rows.length };
  });
  assert.deepEqual(result, {
    names: ['Children', 'Zebra'], info: [{ label: 'Name', value: 'Parent' }, { label: 'Code', value: 0 }, { label: 'Extra', value: 'Visible' }],
    chartLayers: ['children'], title: 'Children', rows: 10,
  });
  assert.equal(this.relationRequests[0].relation, 'children|17');
});

Then('relation table controls preserve server parameters and feature identities', async function () {
  const result = await this.corePage.evaluate(async () => {
    const view = await openRelation();
    view.$el.querySelector('thead tr').children[1].click();
    await coreTestExports.waitFor(() => view.table.rows[0][0] === 'Entry01' && !g3w.state.content.loading, 2000);
    view.$el.querySelector('thead tr').children[1].click();
    await coreTestExports.waitFor(() => view.table.rows[0][0] === 'Entry12' && !g3w.state.content.loading, 2000);
    view.$el.querySelector('button[title="Forward"]').click();
    await coreTestExports.waitFor(() => view.table.page === 2 && view.table.rows.length === 2 && !g3w.state.content.loading, 2000);
    const page = { number: view.table.page, rows: view.table.rows.map(row => row[0]), pages: view.pages };
    const input = view.$el.querySelector('input.column-search');
    input.value = 'Entry01';
    input.dispatchEvent(new KeyboardEvent('keyup', { key: '1', bubbles: true }));
    await coreTestExports.waitFor(() => view.table.features.length === 1 && !g3w.state.content.loading, 2000);
    await Vue.nextTick();
    view.$el.querySelector('.plugin-action').click();
    const select = view.$el.querySelector('.table-toolbar select');
    select.value = '25';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await coreTestExports.waitFor(() => view.table.page_size === 25 && !g3w.state.content.loading, 2000);
    return { page, rows: view.table.rows, actions: relationEffects.actions, ids: view.table.rows_fid };
  });
  assert.deepEqual(result, { page: { number: 2, rows: ['Entry02', 'Entry01'], pages: 2 }, rows: [['Entry01', 1]], actions: [{ layer: 'children', feature: 1 }], ids: [1] });
  assert.ok(this.relationRequests.some(request => request.params.ordering === '-name'));
  assert.ok(this.relationRequests.some(request => request.params.page === 2));
  assert.ok(this.relationRequests.some(request => request.params.field === 'name|ilike|Entry01'));
  assert.equal(this.relationRequests.at(-1).params.page_size, 25);
});

Then('relation row actions zoom to geometry and mount the real attribute form', async function () {
  const result = await this.corePage.evaluate(async () => {
    const view = await openRelation();
    view.$el.querySelector('tbody .fa-map-marker-alt').click();
    view.$el.querySelector('tbody .fa-table').click();
    await Vue.nextTick();
    const form = relationEffects.views.at(-1);
    await Vue.nextTick();
    return {
      zooms: relationEffects.zooms, layer: form.layerid, feature: form.feature.id,
      values: form.fields.map(field => field.value), text: form.$el.textContent,
      options: relationEffects.options.at(-1),
    };
  });
  assert.deepEqual(result.zooms, [{ extent: [1, 2, 1, 2], highlight: true, type: 'Point' }]);
  assert.equal(result.layer, 'children');
  assert.equal(result.feature, 1);
  assert.deepEqual(result.values, ['Entry01', 1]);
  assert.match(result.text, /Children \(1\)/);
  assert.deepEqual(result.options, { title: 1, push: true });
});

Then('relation charts toggle resize and clean up their mounted container', async function () {
  const result = await this.corePage.evaluate(async () => {
    g3w.app.plotLayerIds = ['children'];
    const view = await openRelation();
    const chart = view.$el.querySelector('.fa-chart-bar');
    chart.click();
    await Vue.nextTick();
    const content = document.querySelector('#g3w-content');
    view.$refs.chart.firstElementChild.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    content.dispatchEvent(new MouseEvent('mousemove', { clientX: 1000, bubbles: true }));
    content.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    await Vue.nextTick();
    const width = parseFloat(view.$refs.chart.style.width);
    const expectedWidth = Math.abs(1000 - innerWidth) * 100 / view.$refs.wrapper.clientWidth;
    chart.click();
    await Vue.nextTick();
    chart.click();
    await Vue.nextTick();
    let emitted = false;
    view.$on('hide-chart', () => { emitted = true; });
    view.$destroy();
    return {
      charts: relationEffects.charts.map(effect => ({ ids: effect.ids, fid: effect.options.fid })),
      hidden: relationEffects.hidden.length, resized: relationEffects.resized, emitted, width, expectedWidth, container: view.chart.container,
    };
  });
  assert.deepEqual(result.charts, [{ ids: ['children'], fid: 17 }, { ids: ['children'], fid: 17 }]);
  assert.equal(result.hidden, 2);
  assert.equal(result.resized, 1);
  assert.equal(result.emitted, true);
  assert.ok(Math.abs(result.width - result.expectedWidth) < 0.001);
  assert.equal(result.container, null);
});

Then('relation export failures release download state and allow a successful retry', async function () {
  await this.corePage.evaluate(async () => { await openRelation(); });
  this.relationDownloadFailure = true;
  await this.corePage.locator('.layer-relation .fa-download').click();
  await this.corePage.locator('dialog select[name="format"]').selectOption('Csv');
  await this.corePage.locator('dialog button[type="submit"][value="confirm"]').click();
  await this.corePage.waitForFunction(() => relationEffects.messages.length && !g3w.state.download);
  assert.equal(await this.corePage.evaluate(() => relationEffects.messages[0].message), 'Relation export failed');
  this.relationDownloadFailure = false;
  await this.corePage.locator('.layer-relation .fa-download').click();
  await this.corePage.locator('dialog select[name="format"]').selectOption('Csv');
  const downloadPromise = this.corePage.waitForEvent('download');
  await this.corePage.locator('dialog button[type="submit"][value="confirm"]').click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), 'related.csv');
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  assert.equal(Buffer.concat(chunks).toString(), 'name,value\nEntry01,1\n');
  await this.corePage.waitForFunction(() => !g3w.state.download && !document.querySelector('dialog'));
  await this.corePage.locator('.layer-relation .fa-download').click();
  await this.corePage.evaluate(() => document.querySelector('dialog').click());
  await this.corePage.waitForFunction(() => !document.querySelector('dialog'));
});

Then('relation data parsing failures release loading state and permit retry', async function () {
  await this.corePage.evaluate(async () => { await openRelation(); });
  this.relationDataFailure = true;
  this.relationExpectedWarnings = 1;
  await this.corePage.locator('.layer-relation thead tr').first().locator('th').nth(1).click();
  await this.corePage.waitForFunction(() => relationWarnings.length && !g3w.state.content.loading && !g3w.state.content.disabled);
  assert.equal(await this.corePage.evaluate(() => relationView.table.rows.length), 10);
  this.relationDataFailure = false;
  await this.corePage.locator('.layer-relation thead tr').first().locator('th').nth(1).click();
  await this.corePage.waitForFunction(() => relationView.table.rows[0][0] === 'Entry12' && !g3w.state.content.loading);
});
