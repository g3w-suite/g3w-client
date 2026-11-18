const assert = require('node:assert/strict');
const path = require('node:path');
const { Then } = require('@cucumber/cucumber');
const { listSourceFiles } = require('../support/source-coverage');

Then('all Vue files satisfy the shared data and computed contract', async function () {
  const root = path.resolve('src');
  const files = listSourceFiles(root).filter(file => file.endsWith('.vue'))
    .map(file => path.relative(root, file).split(path.sep).join('/')).sort();
  await this.corePage.exposeFunction('assertVueValue', (actual, expected, message) => assert.deepEqual(actual, expected, message));
  const results = await this.corePage.evaluate(async files => {
    const definitions = coreTestExports.vueComponents;
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    await assertVueValue(Object.keys(definitions).sort(), files, 'Every source Vue file needs a real compiled definition');

    Object.assign(initConfig, {
      i18n: [['it', 'Italiano'], ['en', 'English']],
      header_custom_links: [{ id: 'help', url: '/help/' }],
      main_map_title: 'Map', title: 'Local project', header_logo_img: 'logo.svg',
    });
    Object.assign(initConfig.user, { username: 'contract-user', login_url: '/accounts/login/', is_staff: false });
    Object.assign(g3w.state.project.state, {
      name: 'Local project', map_themes: { project: [{ theme: 'Roads' }], custom: [] },
      edit_url: '/project/', layers_url: '/layers/',
    });
    Object.assign(g3w.state.content, {
      contentsdata: [{ options: { title: 'Search', post_title: 'Roads' } }, { options: { title: 'Feature' } }],
      showgoback: true,
    });
    g3w.state.language = 'en';
    g3w.state.queried_layers = [];
    g3w.state.project.getRelationById = id => fixtureRelations.find(relation => relation.id === id);
    g3w.app.plotLayerIds = ['children', 'other-children'];
    const layer = createFixtureLayer({
      id: 'contract', name: 'Contract layer', geometrytype: 'Point', capabilities: 7,
      crs: { epsg: 'EPSG:3857' }, ows: ['WMS', 'WFS', 'WMTS'], download_csv: true,
    });
    layer.setAttributeTablePageLength(5);
    for (const [id, name] of [['children', 'Visits'], ['other-children', 'Inspections']]) {
      createFixtureLayer({ id, geometrytype: 'Point', crs: { epsg: 'EPSG:3857' } });
      fixtureRelations.push({ id, name, type: 'MANY', referencedLayer: 'contract', referencingLayer: id });
    }
    localStorage.setItem('map:preferences:skin_color', '#123456');
    const fixtures = {
      'components/App.vue': {
        local: 'mouse', update: vm => { vm.custom_theme_input = 'Roads'; },
        expected: { custom_theme_invalid: [null, { theme: 'Roads' }], main_title: ['Map - Local project', 'Map - Local project'] },
      },
      'components/CatalogTree.vue': {
        local: 'legend_categories',
        options: () => ({ propsData: { layerstree: Vue.observable({
          ...layer.state, featurecount: 0, expanded: false, checked: true, visible: true,
        }), legendplace: 'toc' } }),
        update: vm => { vm.layerstree.featurecount = { roads: 7 }; },
        expected: { getFeatureCount: [0, 7], has_feature_count: [true, true] },
      },
      'components/ContextMenu.vue': {
        local: 'items', update: vm => { vm.hue = 120; },
        expected: { hueColor: ['#ff0000', '#00ff00'], layers_url: ['/layers/', '/layers/'] },
      },
      'components/G3WField.vue': {
        local: 'editorFormats',
        options: () => ({ propsData: { fieldType: 'input', state: Vue.observable({
          name: 'enabled', value: 'off', type: 'string', editable: true, visible: true,
          validate: { valid: true },
          input: { type: 'check', options: { values: [
            { value: 'off', checked: false, label: 'Off' }, { value: 'on', checked: true, label: 'On' },
          ] } },
        }) } }),
        update: vm => { vm.state.editable = false; vm.checkboxValue = true; },
        expected: { disabled: [false, true], checkboxValue: [false, true], checkboxLabel: ['Off', 'On'] },
      },
      'components/G3WTabs.vue': {
        local: 'ids',
        options: () => ({ propsData: { layerid: 'contract', contenttype: 'editing',
          tabs: Vue.observable([{ name: 'Main', visible: true, nodes: [] }]),
          feature: { attributes: { name: 'Roads' } },
          fields: [{ name: 'name', validate: { required: true } }],
        } }),
        update: vm => { vm.tabs[0].visible = false; },
        expected: { show: [true, false], required_fields: [['name'], ['name']] },
      },
      'components/ModalAccessibility.vue': {
        update: vm => { vm.high_contrast = true; },
        expected: { theme_color: ['#123456', '#212c31'] },
      },
      'components/ModalAddLayer.vue': {
        local: 'fields',
        update: vm => {
          vm.layers = [{ title: 'Roads' }, { title: 'Rivers' }];
          vm.wms_layers_filter = 'river';
          vm.wms_styles = ['1'];
          vm.layer_type = 'wms';
          vm.wms_layers = [{ title: 'Rivers' }];
        },
        expected: {
          wms_filtered_layers: [[], [{ title: 'Rivers', __idx: '1' }]],
          wms_all_selected: [false, true], can_add_layer: [null, 1],
        },
      },
      'components/ModalChangeMap.vue': {
        local: 'steps', update: vm => { vm.current = 'groups'; },
        expected: { current: ['projects', 'groups'] },
      },
      'components/ModalLogin.vue': {
        update: vm => { vm.show = true; },
        expected: { show: [false, true], login_url: ['/accounts/login/', '/accounts/login/'] },
      },
      'components/ModalMetadata.vue': {
        local: 'legendurls', update: vm => { vm.open = true; },
        expected: { open: [false, true], username: ['contract-user', 'contract-user'] },
      },
      'components/QueryBuilder.vue': {
        local: 'values', update: vm => { vm.filter = '"name" = \'Roads\''; },
        expected: { disabled: [true, false] },
      },
      'components/QueryResults.vue': {
        local: 'proxied_layers', update: () => { g3w.state.queried_layers.push({ id: 'contract' }); },
        expected: { hasResults: [false, true], onelayerresult: [false, true] },
      },
      'components/Relations.vue': {
        local: 'table', options: () => ({ layerId: 'contract', feature: { attributes: { fid: 1 } } }),
        update: vm => { vm.table.allfeatures = 11; },
        expected: { pages: [0, 3], featureId: [1, 1] },
      },
      'components/Search.vue': {
        local: 'state', update: vm => { Vue.set(vm.state, 'searches', [{ name: 'Roads' }]); },
        expected: { state: [{}, { searches: [{ name: 'Roads' }] }] },
      },
      'components/SearchPanel.vue': {
        options: () => ({ service: { state: Vue.observable({
          forminputs: [{ loading: false }], search_layers: [layer], search_1n_relationid: null,
        }) } }),
        update: vm => { vm.state.forminputs[0].loading = true; },
        expected: { loading: [false, true] },
      },
      'components/SpatialBookMarks.vue': {
        local: 'user_bookmarks', update: vm => { vm.showaddform = true; },
        expected: { showaddform: [false, true], lang: ['en', 'en'] },
      },
      'components/Table.vue': {
        local: 'search', options: () => ({ layerId: 'contract' }),
        update: vm => { vm.state.allfeatures = 11; vm.search.page_size = 5; },
        expected: { pages: [0, 3] },
      },
    };
    await assertVueValue(Object.keys(fixtures).sort(), files, 'Every source Vue file needs valid contract inputs');
    const results = [];
    for (const file of files) {
      const fixture = fixtures[file];
      const { props, data, computed, methods } = definitions[file];
      check(data === undefined || typeof data === 'function', `${file}: data must be a factory when provided`);
      // Isolate reactive options; mounted workflows cover lifecycle, watchers and DOM behavior.
      const Component = Vue.extend({ props, data, computed, methods });
      const first = new Component(fixture.options ? fixture.options() : {});
      const second = new Component(fixture.options ? fixture.options() : {});
      try {
        check(first.$data !== second.$data, `${file}: data must not be shared between instances`);
        check(Object.getPrototypeOf(first.$data) === Object.prototype, `${file}: data must return a plain object`);
        if (fixture.local) {
          check(first.$data[fixture.local] !== second.$data[fixture.local],
            `${file}: ${fixture.local} must be allocated per instance`);
        }
        const getters = Object.keys(computed || {});
        const read = () => {
          for (const name of getters) {
            const value = first[name];
            check(Object.is(first[name], value), `${file}: ${name} must be stable between dependency changes`);
          }
        };
        read();
        for (const [name, values] of Object.entries(fixture.expected)) {
          await assertVueValue(first[name], values[0], `${file}: initial ${name}`);
        }
        fixture.update(first);
        await Vue.nextTick();
        read();
        for (const [name, values] of Object.entries(fixture.expected)) {
          await assertVueValue(first[name], values[1], `${file}: updated ${name}`);
        }
        results.push({ file, computed: getters.length });
      } finally {
        first.$destroy();
        second.$destroy();
      }
    }
    return results;
  }, files);
  assert.deepEqual(results.map(result => result.file), files);
  assert.ok(results.some(result => result.computed > 0), 'The common contract must actually read source computed properties');
});
