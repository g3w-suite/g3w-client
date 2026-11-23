const assert = require('node:assert/strict');
const { After, Before, Then } = require('@cucumber/cucumber');

Before({ tags: '@form-workflows' }, async function () {
  this.formErrors = [];
  this.corePage.on('pageerror', error => this.formErrors.push(error.message));
  await this.corePage.evaluate(() => {
    window.formVueErrors = [];
    Vue.config.errorHandler = error => formVueErrors.push(error.stack || error.message);
    Vue.prototype.$t = g3w.gettext;
    Vue.prototype.$cookie = { get: g3w.app.getCookie };
    Vue.mixin({ methods: { isMobile: () => false } });
    Vue.directive('disabled', coreTestExports.disabled);
    Vue.directive('t', coreTestExports.translate);
    Object.assign(initConfig, {
      mediaurl: '/media/', version: 'v4.2.0', powered_by: false,
      urls: { baseurl: '/', clienturl: '/static/client/' },
      layout: { legend: {} }, groups: [], macrogroups: [],
    });
    window.fixtureLayers = {};
    g3w.state.user = { ...initConfig.user };
    Object.assign(g3w.state.project, {
      getId: () => 'project',
      getLayers: () => Object.values(fixtureLayers),
      getLayerById: id => fixtureLayers[id],
      state: { relations: [], bookmarks: [], metadata: {}, WMSUrl: 'http://core.test/ows/' },
    });
    g3w.state.project.getState = () => g3w.state.project.state;
    window.mountFormComponent = async (definition, options = {}) => {
      const Component = Vue.extend(definition);
      const instance = new Component({
        ...options,
        ...(options.propsData ? { propsData: Vue.observable(options.propsData) } : {}),
      }).$mount();
      document.querySelector('#fixture').append(instance.$el);
      await Vue.nextTick();
      await Vue.nextTick();
      return instance;
    };
    window.mountField = async (overrides = {}, props = {}, options = {}) => {
      const state = {
        name: 'field', label: 'Field', type: 'string', value: null, _value: null,
        visible: true, editable: true, validate: { valid: true, required: false },
        input: { type: 'text', options: {} },
        ...overrides,
      };
      return mountFormComponent(g3wsdk.gui.vue.Inputs.G3WInput, {
        ...options, propsData: { state, ...props },
      });
    };
    window.selectEditorContent = (editor, node = editor) => {
      editor.focus();
      const range = document.createRange();
      range.selectNodeContents(node);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    };
  });
});

After({ tags: '@form-workflows' }, async function () {
  const vueErrors = await this.corePage.evaluate(() => formVueErrors);
  assert.deepEqual([...this.formErrors, ...vueErrors], [], 'form workflows must not produce unhandled browser or Vue errors');
});

Then('editing a required field updates validation and parent notifications', async function () {
  const result = await this.corePage.evaluate(async () => {
    const calls = [];
    const change = state => calls.push(['change', state.value, state.validate.valid]);
    const field = await mountField({
      validate: { valid: true, required: true }, help: { message: ' Enter a name ', visible: false },
    }, { changeInput: change, addToValidate: state => calls.push(['add', state.name]) });
    try {
      const initiallyInvalid = field.notvalid && field.$el.querySelector('input').classList.contains('input-error-validation');
      const input = field.$el.querySelector('input');
      input.value = 'Roads';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await Vue.nextTick();
      const edited = { value: field.state.value, valid: field.state.validate.valid, update: field.state.update };
      field.state.validate.unique = true;
      field.state.validate.exclude_values = new Set(['Roads']);
      const duplicate = field.validate();
      field.state.validate.error = 'Server rejected this value';
      field.setErrorMessage();
      const serverError = field.state.validate.message;
      const help = field.showhelpicon;
      field.state.editable = false;
      await Vue.nextTick();
      return { initiallyInvalid, edited, duplicate, serverError, help, tabIndex: field.tabIndex, calls };
    } finally {
      field.$destroy();
    }
  });
  assert.deepEqual(result, {
    initiallyInvalid: true, edited: { value: 'Roads', valid: true, update: true },
    duplicate: false, serverError: 'Server rejected this value', help: 'Enter a name', tabIndex: -1,
    calls: [['add', 'field'], ['change', 'Roads', true]],
  });
});

Then('numeric and coordinate form inputs enforce schema constraints', async function () {
  const result = await this.corePage.evaluate(async () => {
    const cases = [
      { type: 'integer', input: { type: 'text', options: {} }, good: '42', bad: '2147483648' },
      { type: 'bigint', input: { type: 'text', options: {} }, good: '9007199254740991', bad: '9007199254740992' },
      { type: 'float', input: { type: 'text', options: {} }, good: '1.25', bad: 'not a number' },
      { type: 'char', input: { type: 'text', options: {} }, good: 'A', bad: 'AB' },
      { type: 'range', input: { type: 'range', options: { values: [{ min: 2, max: 8, default: 4 }] } }, good: 5, bad: 9 },
      { type: 'integer', input: { type: 'slider', options: { min: 2, max: 8, step: 1 } }, good: 5, bad: 1 },
    ];
    const outcomes = [];
    for (const { good, bad, ...schema } of cases) {
      const field = await mountField({ ...schema, value: good });
      try {
        const valid = field.validate();
        field.state.value = bad;
        const invalid = field.validate();
        outcomes.push([field.type, valid, invalid]);
        if ('range_input' === field.type) {
          field.state.value = null;
          field.checkRangeValue();
          outcomes.push(['range-default', field.state.value]);
        }
      } finally {
        field.$destroy();
      }
    }
    const coordinates = await mountField({
      type: 'lonlat', input: { type: 'lonlat', options: {} },
      values: { lon: 250, lat: -110 }, labels: { lon: 'Longitude', lat: 'Latitude' },
    });
    try {
      outcomes.push(['coordinates', coordinates.state.value, coordinates.validate()]);
    } finally {
      coordinates.$destroy();
    }
    return outcomes;
  });
  assert.deepEqual(result, [
    ['integer_input', true, false], ['bigint_input', true, false], ['float_input', true, false],
    ['text_input', true, false], ['range_input', true, false], ['range-default', 4],
    ['slider_input', true, false], ['coordinates', [[180, -90]], true],
  ]);
});

Then('choice controls synchronize their values with the field schema', async function () {
  const result = await this.corePage.evaluate(async () => {
    const checkbox = await mountField({
      value: 'N', input: { type: 'check', options: { values: [
        { value: 'Y', label: 'Yes', checked: true }, { value: 'N', label: 'No', checked: false },
      ] } },
    });
    const select = await mountField({
      value: '{1,1,2,missing}', input: { type: 'select', options: {
        allowmulti: true, values: [{ key: 'One', value: '1' }, { key: 'Two', value: '2' }],
      } },
    });
    const unique = await mountField({ type: 'integer', value: 1, input: { type: 'unique', options: { values: [1, 2] } } });
    try {
      checkbox.$el.querySelector('input').click();
      await Vue.nextTick();
      const checked = [checkbox.state.value, checkbox.checkboxLabel, checkbox.checkboxValue];
      const decoded = select.getMultiValues();
      await select.onSelectChange({ target: { selected_options: [{ value: 'null' }, { value: '2' }] } });
      const selected = [select.state.value, select.getSelectValue(), select.$refs.select.getAttribute('value')];
      select.state.input.options.values = [{ key: 'One', value: '1' }];
      await Vue.nextTick();
      await Vue.nextTick();
      const removed = select.state.value;
      await unique.onUniqueSelect({ target: { value: '2' } });
      const numeric = unique.state.value;
      await unique.onUniqueSelect({ target: { value: 'null' } });
      return { checked, decoded, selected, removed, numeric, cleared: unique.state.value };
    } finally {
      checkbox.$destroy();
      select.$destroy();
      unique.$destroy();
    }
  });
  assert.deepEqual(result, {
    checked: ['Y', 'Yes', true], decoded: ['1', '2'], selected: ['{2}', '2', '2'],
    removed: null, numeric: 2, cleared: null,
  });
});

Then('read-only fields render their values and release temporary map layers', async function () {
  const result = await this.corePage.evaluate(async () => {
    const map = new ol.Map({ layers: [], controls: [], interactions: [], view: new ol.View({ projection: 'EPSG:4326' }) });
    const originalMap = g3w.app.getMap;
    const originalProjection = g3w.app.getProjection;
    g3w.app.getMap = () => map;
    g3w.app.getProjection = () => map.getView().getProjection();
    const fields = [];
    try {
      const text = await mountField({ value: '<b>Road</b>' }, { fieldType: 'text' });
      fields.push(text);
      const image = await mountField({ value: [{ photo: 'roads.png' }, '/maps/roads.png', null] }, { fieldType: 'photo_field' });
      fields.push(image);
      const media = await mountField({ value: { value: '/files/report.pdf', mime_type: 'application/pdf' } }, { fieldType: 'media' });
      fields.push(media);
      const geo = await mountField({ value: { type: 'Point', coordinates: [12, 45] } }, { fieldType: 'geo' });
      fields.push(geo);
      geo.$el.querySelector('span').click();
      const result = {
        text: text.$el.textContent.trim(), images: image.images,
        media: [media.filename, media.media.type, media.$el.querySelector('a').getAttribute('href')],
        geometry: geo.layer.getSource().getFeatures()[0].getGeometry().getCoordinates(),
        visible: geo.layer.getVisible(), added: map.getLayers().getLength(),
      };
      geo.$destroy();
      result.remaining = map.getLayers().getLength();
      return result;
    } finally {
      fields.filter(field => !field._isDestroyed).forEach(field => field.$destroy());
      g3w.app.getMap = originalMap;
      g3w.app.getProjection = originalProjection;
      map.dispose();
    }
  });
  assert.deepEqual(result, {
    text: 'Road', images: [{ src: '/media/roads.png' }, { src: '/maps/roads.png' }, { src: '' }],
    media: ['report.pdf', 'pdf', '/files/report.pdf'], geometry: [12, 45], visible: true, added: 1, remaining: 0,
  });
});

Then('rich text editing preserves formatting without retaining unsafe markup', async function () {
  const result = await this.corePage.evaluate(async () => {
    const field = await mountField({
      value: '<p onclick="bad()">Hello <strong>world</strong><script>bad()</script></p>',
      input: { type: 'texthtml', options: {} },
    });
    try {
      const editor = field.$refs.rich_text_editor;
      const sanitized = editor.innerHTML;
      selectEditorContent(editor, editor.querySelector('strong'));
      field.runEditorCommand('italic');
      const italic = !!editor.querySelector('em');
      selectEditorContent(editor, editor.querySelector('p'));
      field.applyEditorColor('foreColor', '#ff0000');
      const color = editor.querySelector('span').style.color;
      selectEditorContent(editor, editor.querySelector('p'));
      field.runEditorCommand('justifyCenter');
      const centered = editor.querySelector('p').style.textAlign;
      field.toggleEditorColorPicker('text');
      const palette = field.editorColorPicker;
      field.toggleEditorColorPicker('text');
      selectEditorContent(editor);
      field.cleanEditorFormatting();
      const clean = editor.textContent;
      const safe = field.sanitizeEditorHtml('<a href="javascript:bad()" onclick="bad()">No</a><a href="https://example.test/">Yes</a><custom>Text</custom>');
      selectEditorContent(editor);
      let pastePrevented = false;
      field.onRichTextPaste({
        preventDefault() { pastePrevented = true; },
        clipboardData: { getData: type => type === 'text/html' ? '<p>Paste<img src=x onerror=bad()></p>' : 'Paste' },
      });
      const pasted = editor.innerHTML;
      field.toggleEditorSource();
      const source = field.edit_state.show_html;
      field.toggleEditorSource();
      return { sanitized, italic, color, centered, palette, clean, safe, pastePrevented, pasted, source, visual: !field.edit_state.show_html };
    } finally {
      field.$destroy();
    }
  });
  assert.equal(result.sanitized, '<p>Hello <strong>world</strong></p>');
  assert.equal(result.italic, true);
  assert.equal(result.color, 'rgb(255, 0, 0)');
  assert.equal(result.centered, 'center');
  assert.equal(result.palette, 'text');
  assert.equal(result.clean, 'Hello world');
  assert.equal(result.safe, '<a>No</a><a href="https://example.test/" target="_blank" rel="noopener noreferrer">Yes</a>Text');
  assert.equal(result.pastePrevented, true);
  assert.equal(result.pasted, '<p>Paste</p>');
  assert.equal(result.source, true);
  assert.equal(result.visual, true);
});

Then('the rich text link dialog validates URLs and applies link edits', async function () {
  const result = await this.corePage.evaluate(async () => {
    const field = await mountField({ value: '<p>Roads</p>', input: { type: 'texthtml', options: {} } });
    try {
      const editor = field.$refs.rich_text_editor;
      selectEditorContent(editor, editor.querySelector('p'));
      field.saveEditorSelection();
      field.openEditorLink();
      let dialog = field.editorLinkDialog;
      let input = dialog.querySelector('input');
      input.value = 'javascript:bad()';
      dialog.querySelector('button[value="save"]').click();
      const invalid = !input.checkValidity() && dialog.open;
      input.value = 'example.test/roads';
      input.dispatchEvent(new Event('input'));
      dialog.querySelector('button[value="save"]').click();
      await coreTestExports.waitFor(() => !dialog.isConnected, 1000);
      const created = editor.querySelector('a').outerHTML;
      editor.querySelector('a').click();
      dialog = field.editorLinkDialog;
      input = dialog.querySelector('input');
      input.value = '/roads';
      input.dispatchEvent(new Event('input'));
      const visit = dialog.querySelector('a').getAttribute('href');
      dialog.querySelector('button[value="save"]').click();
      await coreTestExports.waitFor(() => !dialog.isConnected, 1000);
      const edited = editor.querySelector('a').getAttribute('href');
      editor.querySelector('a').click();
      dialog = field.editorLinkDialog;
      dialog.querySelector('button[value="remove"]').click();
      await coreTestExports.waitFor(() => !dialog.isConnected, 1000);
      const removed = !editor.querySelector('a') && editor.textContent === 'Roads';
      return { invalid, created, visit, edited, removed, safeMail: field.getEditorLinkHref('mailto:test@example.test') };
    } finally {
      field.$destroy();
    }
  });
  assert.deepEqual(result, {
    invalid: true, created: '<a href="https://example.test/roads" target="_blank" rel="noopener noreferrer">Roads</a>',
    visit: '/roads', edited: '/roads', removed: true, safeMail: 'mailto:test@example.test',
  });
});

Then('the rich text table tools update the selected table', async function () {
  const result = await this.corePage.evaluate(async () => {
    const field = await mountField({ value: '<p>Table</p>', input: { type: 'texthtml', options: {} } });
    try {
      const editor = field.$refs.rich_text_editor;
      selectEditorContent(editor);
      field.insertEditorTable();
      const table = editor.querySelector('table');
      const sizes = [[table.rows.length, table.rows[0].cells.length]];
      for (const action of ['row-above', 'row-below', 'column-left', 'column-right', 'column-remove', 'row-remove']) {
        selectEditorContent(editor, table.rows[0].cells[0]);
        field.editEditorTable(action);
        sizes.push([table.rows.length, table.rows[0].cells.length]);
      }
      return { sizes, stored: field.state.value === editor.innerHTML };
    } finally {
      field.$destroy();
    }
  });
  assert.deepEqual(result, { sizes: [[1, 1], [2, 1], [3, 1], [3, 2], [3, 3], [3, 2], [2, 2]], stored: true });
});

Then('accessibility preferences update styles storage and motion settings', async function () {
  const result = await this.corePage.evaluate(async () => {
    const style = document.createElement('style');
    style.textContent = 'body { --skin-color: #123456; --skin-primary: #abcdef; }';
    document.head.append(style);
    document.querySelector('#fixture').innerHTML = '<div class="navbar"></div>';
    localStorage.setItem('map:preferences:skin_color', '#456789');
    localStorage.setItem('map:preferences:skin_primary', '#987654');
    localStorage.setItem('map:preferences:sidebar_open', 'false');
    localStorage.setItem('map:accessibility:high_contrast', 'true');
    localStorage.setItem('map:accessibility:reduced_motion', 'true');
    const modal = await mountFormComponent(coreTestExports.Accessibility);
    try {
      const restored = {
        theme: modal.theme_color, primary: modal.primary_color,
        motion: document.body.classList.contains('reduced-motion'),
        collapsed: document.body.classList.contains('sidebar-collapse'),
      };
      modal.show();
      const opened = modal.$refs.dialog.open;
      modal.close();
      modal.setColor('skin_color', '--skin-color', '#112233');
      modal.setSidebarOpenAtStartup(true);
      modal.setReducedMotion(false);
      const changed = {
        contrast: modal.high_contrast, theme: modal.theme_color,
        navbar: document.querySelector('.navbar').style.getPropertyValue('--skin-color'),
        stored: localStorage.getItem('map:preferences:skin_color'),
        sidebar: localStorage.getItem('map:preferences:sidebar_open'),
        motion: document.body.classList.contains('reduced-motion'),
      };
      modal.resetPreferences();
      return {
        restored, opened, changed,
        reset: {
          theme: modal.theme_color, primary: modal.primary_color, sidebar: modal.sidebar_open_at_startup,
          stored: localStorage.length, inline: document.body.style.getPropertyValue('--skin-color'),
        },
      };
    } finally {
      modal.$destroy();
    }
  });
  assert.deepEqual(result, {
    restored: { theme: '#212c31', primary: '#0056b3', motion: true, collapsed: true }, opened: true,
    changed: { contrast: false, theme: '#112233', navbar: '#112233', stored: '#112233', sidebar: 'true', motion: false },
    reset: { theme: '#123456', primary: '#abcdef', sidebar: true, stored: 0, inline: '' },
  });
});

Then('query builder searches use local data and persist named filters', async function () {
  const requests = [];
  await this.corePage.route('**/fixture/values/**', route => {
    requests.push(Object.fromEntries(new URL(route.request().url()).searchParams));
    return route.fulfill({ json: { result: true, data: [['A', 'A road'], ['B', 'B road']] } });
  });
  const result = await this.corePage.evaluate(async () => {
    fixtureLayers.roads = {
      id: 'roads', title: 'Roads', fields: [{ name: 'name', label: 'Name', show: true }],
      getName: () => 'Roads', getUrl: () => '/fixture/values/',
    };
    fixtureLayers.codes = { getName: () => 'Codes', getFields: () => [{ name: 'code' }] };
    g3w.state.project.state.relations = [{
      referencedLayer: 'roads', referencingLayer: 'codes', type: 'ONE',
    }];
    const search = { state: { querybuildersearches: [] } };
    const calls = [];
    const originals = { prompt: g3w.app.prompt, getData: g3w.app.getData, getService: g3w.app.getService };
    g3w.app.prompt = async () => 'Saved roads';
    g3w.app.getService = id => {
      if (id !== 'search') throw new Error(`Unexpected service: ${id}`);
      return search;
    };
    g3w.app.getData = async (action, options) => {
      calls.push({ action, filter: options.inputs.filter, count: options.inputs.feature_count });
      return { data: [{ features: [{ id: 1 }, { id: 2 }] }] };
    };
    const builder = await mountFormComponent(coreTestExports.QueryBuilder);
    let editing;
    try {
      const initial = { fields: builder.fields, disabled: builder.disabled };
      builder.select.field = 'name';
      await Vue.nextTick();
      await builder.all();
      await builder.all();
      const values = builder.values;
      builder.addToExpression({ value: 'name', type: 'field' });
      builder.addToExpression({ value: '=', type: 'operator' });
      builder.addToExpression({ value: 'A', type: 'value' });
      await builder.run();
      const message = builder.message;
      await builder.save();
      await coreTestExports.waitFor(() => g3w.state.querybuilder.searches.project.length === 1, 1000);
      const saved = JSON.parse(localStorage.getItem('QUERYBUILDERSEARCHES')).project[0];
      editing = await mountFormComponent(coreTestExports.QueryBuilder, {
        options: { id: saved.id, name: saved.name, layerId: saved.layerId, filter: '"name" = \'B\'' },
      });
      await editing.save();
      await coreTestExports.waitFor(() => g3w.state.querybuilder.searches.project[0]?.filter === '"name" = \'B\'', 1000);
      const edited = JSON.parse(localStorage.getItem('QUERYBUILDERSEARCHES')).project;
      builder.onCurrentlayerChange({ target: { value: 0 } });
      return {
        initial, values, calls, message,
        saved: { name: saved.name, layerId: saved.layerId, layerName: saved.layerName, filter: saved.filter, hasId: !!saved.id },
        edited: edited.map(({ name, filter }) => ({ name, filter })), registered: search.state.querybuildersearches.length,
        reset: [builder.filter, builder.message, builder.select.field, builder.select.value, builder.disabled],
        loading: builder.loading,
      };
    } finally {
      builder.$destroy();
      editing?.$destroy();
      Object.assign(g3w.app, originals);
    }
  });
  assert.deepEqual(requests, [{ ordering: 'name', formatter: '1', fformatter: 'name' }]);
  assert.deepEqual(result, {
    initial: { fields: [{ name: 'name', label: 'Name' }], disabled: true },
    values: [['A', 'A road'], ['B', 'B road']],
    calls: [{ action: 'search:features', filter: 'name|eq|A', count: 100 }], message: ' 2',
    saved: { name: 'Saved roads', layerId: 'roads', layerName: 'Roads', filter: '"name" = \'A\'', hasId: true },
    edited: [{ name: 'Saved roads', filter: '"name" = \'B\'' }], registered: 1,
    reset: ['', '', null, null, true], loading: { test: false, values: false },
  });
});

Then('spatial bookmarks persist and restore the selected map extent', async function () {
  await this.corePage.setViewportSize({ width: 600, height: 800 });
  const result = await this.corePage.evaluate(async () => {
    initConfig.user.is_staff = true;
    localStorage.setItem('SPATIALBOOKMARKS', JSON.stringify({ other: [{ id: 'keep' }] }));
    const calls = [];
    const originals = Object.fromEntries(['getMapExtent', 'getCrs', 'getEpsg', 'getProjection', 'zoomToExtent', 'getPermalink']
      .map(name => [name, g3w.app[name]]));
    Object.assign(g3w.app, {
      getMapExtent: () => [0, 0, 10, 10], getCrs: () => 'EPSG:3857', getEpsg: () => 'EPSG:3857',
      getProjection: () => ol.proj.get('EPSG:3857'),
      zoomToExtent: async (extent, options) => calls.push({ extent, ...options }),
      getPermalink: url => calls.push({ share: url.href }),
    });
    const bookmarks = await mountFormComponent(coreTestExports.Bookmarks);
    try {
      bookmarks.showAddForm();
      await Vue.nextTick();
      const open = bookmarks.$refs.add_bookmark.open;
      bookmarks.addbookmarkinput = 'City';
      bookmarks.addBookMark();
      await Vue.nextTick();
      const saved = JSON.parse(localStorage.getItem('SPATIALBOOKMARKS'));
      const bookmark = bookmarks.user_bookmarks[0];
      await bookmarks.gotoSpatialBookmark(bookmark);
      await bookmarks.shareBookmark(bookmark);
      bookmarks.showAddForm();
      await Vue.nextTick();
      bookmarks.$emit('close');
      await Vue.nextTick();
      bookmarks.removeBookMark(bookmark.id);
      return {
        open, staff: bookmarks.is_staff, mobile: bookmarks.is_mobile, language: bookmarks.lang,
        saved: { ...saved.project[0], id: !!saved.project[0].id }, other: saved.other,
        calls, closed: !bookmarks.$refs.add_bookmark.open,
        remaining: JSON.parse(localStorage.getItem('SPATIALBOOKMARKS')).project,
        sidebarHidden: document.body.classList.contains('sidebar-collapse'),
      };
    } finally {
      bookmarks.$destroy();
      Object.assign(g3w.app, originals);
    }
  });
  assert.deepEqual(result, {
    open: true, staff: true, mobile: true, language: 'en',
    saved: { id: true, name: 'City', extent: [0, 0, 10, 10], removable: true, crs: { epsg: 3857 } },
    other: [{ id: 'keep' }],
    calls: [{ extent: [0, 0, 10, 10], force: true }, { extent: [0, 0, 10, 10], force: true }, { share: 'http://core.test/' }],
    closed: true, remaining: [], sidebarHidden: true,
  });
});

Then('expression-driven tabs update visibility and validation membership', async function () {
  const requests = [];
  await this.corePage.route('**/api/expression_eval/project/', route => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ json: { result: true, value: requests.length === 1 } });
  });
  const result = await this.corePage.evaluate(async () => {
    const fields = [{
      name: 'name', label: 'Name', type: 'string', value: 'Road', _value: 'Road', visible: true, editable: true,
      validate: { required: true, valid: true }, input: { type: 'text', options: {} },
    }];
    const tab = {
      name: 'Details', nodes: [{ name: 'Group', nodes: [{ field_name: 'name' }] }],
      visibility_expression: { expression: '"name" IS NOT NULL', referenced_columns: ['name'] },
    };
    const removed = [];
    const instance = await mountFormComponent(coreTestExports.Tabs, {
      propsData: {
        layerid: 'roads', tabs: [tab], fields, contenttype: 'editing',
        feature: new ol.Feature({ name: 'Road' }), removeToValidate: field => removed.push(field.name),
      },
    });
    let query;
    try {
      await coreTestExports.waitFor(() => instance.ids.length === 1, 1000);
      const initial = { visible: tab.visible, required: tab.required, fields: instance.required_fields };
      const relation = { name: 'inspections' };
      const relationState = { loading: true };
      g3w.state.project.getRelationById = id => id === relation.name ? { name: 'Inspections', referencingLayer: 'checks' } : undefined;
      fixtureLayers.roads = { getRelationById: () => ({ state: relationState }) };
      fixtureLayers.checks = { isEditable: () => true };
      const relations = [
        instance.getRelationName(relation.name), instance.loadingRelation(relation).loading,
        instance.isRelationDisabled(relation), instance.isRelationDisabled({ name: 'unknown' }),
      ];
      const field = instance.getField('name').name;
      fields[0].value = 'Updated';
      await coreTestExports.waitFor(() => tab.visible === false, 1000);
      const unwatch = instance.unwatch.length;
      query = await mountFormComponent(coreTestExports.Tabs, {
        propsData: {
          layerid: 'roads', tabs: [{
            name: 'Query', nodes: [], visibility_expression: { expression: 'true', referenced_columns: [] },
          }],
          fields: [], contenttype: 'query',
          feature: { id: 7, geometry: new ol.geom.Point([12, 45]), attributes: { name: 'Road', geometry: 'exclude' } },
        },
      });
      await coreTestExports.waitFor(() => query.ids.length === 1, 1000);
      instance.$destroy();
      return { initial, relations, field, removed, unwatch, released: instance.unwatch === null, hidden: !tab.visible };
    } finally {
      if (!instance._isDestroyed) instance.$destroy();
      query?.$destroy();
    }
  });
  assert.deepEqual(result, {
    initial: { visible: true, required: true, fields: ['name'] },
    relations: ['Inspections', true, false, true], field: 'name', removed: ['name'], unwatch: 1, released: true, hidden: true,
  });
  assert.equal(requests.length, 3);
  assert.equal(requests[0].formatter, 0);
  assert.equal(requests[1].expression, '"name" IS NOT NULL');
  assert.deepEqual(requests[2].form_data, {
    type: 'Feature', id: 7, geometry: { type: 'Point', coordinates: [12, 45] }, properties: { name: 'Road' },
  });
  assert.equal(requests[2].formatter, 1);
});

Then('metadata dialogs derive service links and restore legend configuration', async function () {
  await this.corePage.route('**/fixture/credits', route => route.fulfill({ body: '<p>Local credits</p>' }));
  await this.corePage.route('https://unpkg.com/platform@1.3.6/platform.js', route => route.fulfill({
    contentType: 'text/javascript',
    body: 'window.platform = { name: "Fixture browser", version: "1", os: { toString() { return "Fixture OS"; } } };',
  }));
  const result = await this.corePage.evaluate(async () => {
    initConfig.credits = '/fixture/credits';
    initConfig.plugins = { local: { version: '1.0' } };
    initConfig.layout.legend = { transparent: true, color: 'white', layertitle: false };
    g3w.state.project.state.WMSUrl = 'http://core.test/ows/';
    createFixtureLayer({
      id: 'roads', geometrytype: 'Polygon', crs: { epsg: 'EPSG:3857' }, ows: ['WMS', 'WFS', 'WMTS'],
      metadata: { attributes: [], keywords: [] },
    });
    g3w.state.project.state.metadata = {};
    const calls = [];
    const original = g3w.app.getLegendSrc;
    g3w.app.getLegendSrc = async options => {
      calls.push({ options, legend: { ...initConfig.layout.legend } });
      return ['http://core.test/legend.png'];
    };
    g3wsdk.core.ApplicationService.complete = true;
    const metadata = await mountFormComponent(coreTestExports.Metadata);
    try {
      await coreTestExports.waitFor(() => metadata.customcredits, 1000);
      const links = metadata.project.metadata;
      metadata.$el.querySelector('a[href="#metadata_legend"]').click();
      await Vue.nextTick();
      metadata.$el.querySelector('a[href="#metadata_legend"]').click();
      await Vue.nextTick();
      await metadata.onBeforetoggle({ newState: 'open' });
      const legend = new URL(metadata.getLegendUrlById('roads'));
      return {
        links, credits: metadata.customcredits, docs: metadata.docs_url, username: metadata.username,
        calls, restored: initConfig.layout.legend, legends: metadata.legendurls,
        info: ['Fixture browser 1', 'Fixture OS', 'local: __1.0__'].every(text => metadata.g3wsdk_info.includes(text)),
        sanitized: [metadata.sanitizeValue([]), metadata.sanitizeValue({ key: 'value' })],
        legend: [legend.searchParams.get('STYLES'), legend.searchParams.get('LAYERTITLE')],
        url: metadata.getLegendUrl('http://core.test/legend.png'),
      };
    } finally {
      metadata.$destroy();
      g3w.app.getLegendSrc = original;
    }
  });
  assert.deepEqual(result, {
    links: {
      wms_url: 'http://core.test/ows/?service=WMS&version=1.3.0&request=GetCapabilities',
      wmts_url: 'http://core.test/ows/?service=WMTS&version=1.3.0&request=GetCapabilities',
      wfs_url: 'http://core.test/ows/?service=WFS&version=1.3.0&request=GetCapabilities',
      wfs3_url: 'http://core.test/ows/wfs3/',
    },
    credits: '<p>Local credits</p>', docs: 'https://g3w-suite.readthedocs.io/en/v4.2.x/', username: 'anonymous',
    calls: [{ options: { all: true }, legend: { transparent: true, color: 'black', layertitle: true } }],
    restored: { transparent: true, color: 'white', layertitle: false }, legends: ['http://core.test/legend.png'], info: true,
    sanitized: ['', { key: 'value' }], legend: ['default', 'false'], url: 'http://core.test/legend.png',
  });
});

Then('map chooser navigation preserves its history and cached responses', async function () {
  const requests = [];
  await this.corePage.route('**/en/about/api/group/**', route => {
    const pathname = new URL(route.request().url()).pathname;
    requests.push(pathname);
    return route.fulfill({ json: pathname.endsWith('/projects/')
      ? [{ id: 'target', title: 'Target', thumbnail: 'target.png' }]
      : [{ id: 'city', title: 'City', srid: 3857, header_logo_img: 'city.png' }] });
  });
  const result = await this.corePage.evaluate(async () => {
    initConfig.id = 'local';
    initConfig.macrogroups = [{ id: 'country', title: 'Country', logo_img: 'country.png' }, { id: 'other', title: 'Other' }];
    initConfig.groups = [{ id: 'local', title: 'Local', srid: 3857 }];
    initConfig.projects = [{ id: 'nearby', title: 'Nearby', thumbnail: 'nearby.png', listable: true }];
    const chooser = await mountFormComponent(coreTestExports.ChangeMap);
    try {
      const initial = chooser.items.map(item => [item.title, item.thumbnail]);
      chooser.showRoot();
      await chooser.trigger(initConfig.macrogroups[0]);
      const groups = chooser.items.map(item => item.id);
      await chooser.trigger(chooser.items[0]);
      const projects = chooser.items.map(item => item.id);
      await chooser.back();
      const back = [chooser.current, chooser.items[0].id];
      await chooser.back();
      const root = chooser.current;
      await chooser.showMacroGroups(['country', 'other']);
      const multiple = [chooser.current, chooser.items.length];
      await chooser.back();
      await chooser.showMacroGroups(['country']);
      await chooser.showProjects(initConfig.groups[0]);
      const local = chooser.items.map(item => item.id);
      const image = {};
      chooser.setItemImageSrc({ item: image, type: 'project' });
      image.thumbnail = 'missing.png';
      chooser.setItemImageSrc({ item: image, type: 'net_error' });
      return { initial, groups, projects, back, root, multiple, local, fallback: image.thumbnail, loading: chooser.loading };
    } finally {
      chooser.$destroy();
    }
  });
  assert.deepEqual(requests, ['/en/about/api/group/country/', '/en/about/api/group/city/projects/']);
  assert.deepEqual(result, {
    initial: [['Nearby', '/media/nearby.png']], groups: ['city'], projects: ['target'], back: ['groups', 'city'],
    root: 'root', multiple: ['macrogroups', 2], local: ['nearby'],
    fallback: '/static/client/images/logo_gis3w_156_85.png', loading: false,
  });
});

Then('autocomplete preserves selected IDs while refreshing remote suggestions', async function () {
  const requests = [];
  await this.corePage.route('**/vector/data/**', route => {
    const data = route.request().postDataJSON();
    requests.push(data);
    const rows = data.suggest
      ? [{ id: 2, name: 'Alpha updated' }, { id: 4, name: 'Road new' }]
      : [{ id: 1, name: 'Zulu' }, { id: 2, name: 'Alpha' }, { id: 3, name: 'Bravo' }];
    return route.fulfill({ json: { result: true, vector: { count: rows.length, data: {
      type: 'FeatureCollection', features: rows.map(properties => ({
        type: 'Feature', id: properties.id, geometry: null, properties,
      })),
    } } } });
  });
  const result = await this.corePage.evaluate(async () => {
    createFixtureLayer({ id: 'choices', fields: [{ name: 'id' }, { name: 'name' }] });
    const field = await mountField({
      value: '{1,2,3}', input: { type: 'select_autocomplete', options: {
        layer_id: 'choices', key: 'id', value: 'name', values: [], allowmulti: true, usecompleter: true,
      } },
    });
    try {
      await coreTestExports.waitFor(() => field.state.input.options.values.length === 3, 1000);
      const restored = field.state.input.options.values.map(option => ({ ...option }));
      field.searchAutocomplete({ detail: { value: ' road ' } });
      await coreTestExports.waitFor(() => field.state.input.options.values.some(option => option.value === 4), 2000);
      const suggestions = field.state.input.options.values.map(option => ({ ...option })).sort((a, b) => a.value - b.value);
      field.searchAutocomplete({ detail: { value: '' } });
      return { restored, suggestions, selected: field.getMultiValues() };
    } finally {
      field.$destroy();
    }
  });
  assert.equal(requests.length, 2);
  assert.equal(requests[0].field, 'id|eq|1|OR,id|eq|2|OR,id|eq|3');
  assert.equal(requests[1].suggest, 'name|road');
  assert.equal(requests[1].ordering, 'name');
  assert.deepEqual(result, {
    restored: [{ key: 'Alpha', value: 2 }, { key: 'Bravo', value: 3 }, { key: 'Zulu', value: 1 }],
    suggestions: [
      { key: 'Zulu', value: 1 }, { key: 'Alpha updated', value: 2 }, { key: 'Bravo', value: 3 }, { key: 'Road new', value: 4 },
    ],
    selected: ['1', '2', '3'],
  });
});

Then('{string} relation filters load a {string} record and refresh dependent choices', async function (mode, record) {
  const requests = [];
  await this.corePage.route('**/vector/data/**', route => {
    const data = route.request().postDataJSON();
    requests.push({ data, url: route.request().url() });
    if (data.unique) {
      return route.fulfill({ json: { result: true, data: data.unique === 'region' ? ['North', 'South'] : ['A', 'B'] } });
    }
    if (data.fformatter) {
      return route.fulfill({ json: { result: true, data: (data.ffield || '').includes('South') ? [[8, 'South road']] : [[7, 'North road']] } });
    }
    return route.fulfill({ json: { result: true, vector: { data: {
      type: 'FeatureCollection', features: [{
        type: 'Feature', id: 7, geometry: null, properties: { id: 7, region: 'North', district: data.field?.includes('South') ? 'B' : 'A' },
      }],
    } } } });
  });
  const result = await this.corePage.evaluate(async ({ mode, record }) => {
    fixtureRelations.push({
      id: 'location', name: 'Location', referencedLayer: 'parents', referencingLayer: 'children',
      fieldRef: { referencedField: ['id'], referencingField: ['parent_id'] },
    });
    g3w.state.project.getRelationById = id => fixtureRelations.find(relation => relation.id === id);
    createFixtureLayer({
      id: 'parents', fields: [
        { name: 'id', label: 'ID' }, { name: 'region', label: 'Region' }, { name: 'district', label: 'District' },
      ],
    });
    createFixtureLayer({ id: 'children' });
    const field = await mountField({
      value: record === 'saved' ? 7 : null,
      input: { type: 'select', options: {
        values: [], loading: { state: 'ready' }, relation_reference: true, relation_id: 'location',
        filter_fields: ['region', 'district'], chain_filters: mode === 'chained',
      } },
    });
    try {
      await coreTestExports.waitFor(() => field.isFilterFieldsReady, 2000);
      const restored = field.filterFields.map(filter => ({ id: filter.id, value: filter.value, disabled: !!filter.disabled }));
      field.filterFields[0].value = 'South';
      await coreTestExports.waitFor(() => field.state.value === 8 && field.loadingState === 'ready', 2000);
      const changed = {
        value: field.state.value, options: field.state.input.options.values.map(option => ({ ...option })),
        second: { value: field.filterFields[1].value, disabled: !!field.filterFields[1].disabled },
      };
      field.$destroy();
      return { restored, changed, released: field.filterFieldsUnwatches === null };
    } finally {
      if (!field._isDestroyed) field.$destroy();
    }
  }, { mode, record });
  const saved = record === 'saved';
  assert.deepEqual(result.restored, [
    { id: 'region', value: saved ? 'North' : 'null', disabled: false },
    { id: 'district', value: saved ? 'A' : 'null', disabled: mode === 'chained' && !saved },
  ]);
  assert.deepEqual(result.changed, {
    value: 8, options: [{ key: 'South road', value: 8 }],
    second: { value: mode === 'independent' && saved ? 'A' : 'null', disabled: false },
  });
  assert.equal(result.released, true);
  assert.ok(requests.some(({ data }) => data.unique === 'region'));
  assert.ok(requests.some(({ data }) => data.ffield?.includes('region|eq|South')));
});

Then('media uploads preserve the last valid file when the server rejects an upload', async function () {
  const uploads = [];
  await this.corePage.route('**/fixture/upload', route => {
    uploads.push(route.request().postData());
    return route.fulfill({ json: uploads.length === 1
      ? { result: true, data: { value: '/media/report.pdf', mime_type: 'application/pdf' } }
      : { result: false, error: 'File type not allowed' } });
  });
  const result = await this.corePage.evaluate(async () => {
    document.cookie = 'csrftoken=fixture-token';
    const messages = [];
    const original = g3w.app.showUserMessage;
    g3w.app.showUserMessage = options => messages.push(options);
    const field = await mountField({
      input: { type: 'media', options: { uploadurl: '/fixture/upload', allowed_types: ['pdf', '.png'] } },
    });
    try {
      const event = { target: { files: [new File(['fixture'], 'report.pdf', { type: 'application/pdf' })] } };
      await field.onChangeFile(event);
      await Vue.nextTick();
      const uploaded = { ...field.state.value };
      await field.onChangeFile(event);
      return {
        accept: field.accept, uploaded, retained: field.state.value, preview: { ...field.mediaData },
        loading: field.loading, messages,
      };
    } finally {
      field.$destroy();
      g3w.app.showUserMessage = original;
    }
  });
  assert.equal(uploads.length, 2);
  for (const body of uploads) {
    assert.match(body, /name="csrfmiddlewaretoken"\r\n\r\nfixture-token/);
    assert.match(body, /name="field"; filename="report.pdf"/);
  }
  const media = { value: '/media/report.pdf', mime_type: 'application/pdf' };
  assert.deepEqual(result, {
    accept: '.pdf,.png', uploaded: media, retained: media, preview: media, loading: false,
    messages: [{ type: 'alert', message: 'File type not allowed' }],
  });
});

Then('feature picking updates the field and releases its interaction', async function () {
  const requests = [];
  await this.corePage.route('**/fixture/pick', route => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ json: { id: 7, name: 'Picked road' } });
  });
  const result = await this.corePage.evaluate(async () => {
    const map = new ol.Map({ layers: [], controls: [], interactions: [], view: new ol.View({ center: [0, 0], zoom: 2 }) });
    map.setSize([256, 256]);
    const originals = Object.fromEntries(['getMap', 'addInteraction', 'removeInteraction', 'setModal', 'showUserMessage']
      .map(name => [name, g3w.app[name]]));
    const modal = [];
    const messages = [];
    Object.assign(g3w.app, {
      getMap: () => map, addInteraction: interaction => map.addInteraction(interaction),
      removeInteraction: interaction => map.removeInteraction(interaction),
      setModal: value => modal.push(value), showUserMessage: options => messages.push(options),
    });
    fixtureLayers.roads = {
      getType: () => 'vector',
      query: async ({ coordinates, feature_count }) => ({
        data: [{ features: [new ol.Feature(await (await fetch('/fixture/pick', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coordinates, feature_count }),
        })).json())] }],
      }),
    };
    const field = await mountField({
      input: { type: 'select_autocomplete', options: { layer_id: 'roads', key: 'id', value: 'name', values: [], usecompleter: true } },
    });
    try {
      const picking = field.pickLayerValue();
      const attached = map.getInteractions().getLength();
      field.interaction.dispatchEvent({ type: 'picked', coordinate: [12, 45] });
      await picking;
      const values = { value: field.state.value, options: field.state.input.options.values.map(option => ({ ...option })) };
      field.escKeyUpHandler(new KeyboardEvent('keyup', { key: 'Escape' }));
      return { attached, values, messages, modal, active: field.isPicked(), remaining: map.getInteractions().getLength() };
    } finally {
      field.$destroy();
      Object.assign(g3w.app, originals);
      map.dispose();
    }
  });
  assert.deepEqual(requests, [{ coordinates: [12, 45], feature_count: 1 }]);
  assert.deepEqual(result, {
    attached: 1, values: { value: 7, options: [{ key: 'Picked road', value: 7 }] },
    messages: [{ type: 'success', autoclose: true }], modal: [false, true, true], active: false, remaining: 0,
  });
});

Then('coordinate capture transforms picked positions and releases its map listeners', async function () {
  const result = await this.corePage.evaluate(async () => {
    const map = new ol.Map({ layers: [], controls: [], interactions: [], view: new ol.View({ center: [0, 0], zoom: 2 }) });
    map.setSize([256, 256]);
    g3w.state.project.getProjection = () => map.getView().getProjection();
    const original = g3w.app.getMap;
    g3w.app.getMap = () => map;
    const field = await mountField({
      type: 'lonlat', epsg: 'EPSG:4326', values: { lon: 0, lat: 0 }, labels: { lon: 'Longitude', lat: 'Latitude' },
      input: { type: 'lonlat', options: {} },
    });
    try {
      field.toggleGetCoordinate();
      const event = new ol.MapBrowserEvent('click', map, new MouseEvent('click'));
      event.coordinate = ol.proj.fromLonLat([12, 45]);
      map.dispatchEvent(event);
      const coordinates = field.state.value[0].slice();
      g3w.app.emit('mapcontrol:toggled', { target: { isToggled: () => true, isClickMap: () => true } });
      const released = field.eventMapKey === null && !field.coordinatebutton.active;
      event.coordinate = ol.proj.fromLonLat([0, 0]);
      map.dispatchEvent(event);
      return { coordinates, released, unchanged: JSON.stringify(field.state.value[0]) === JSON.stringify(coordinates) };
    } finally {
      field.$destroy();
      g3w.app.getMap = original;
      map.dispose();
    }
  });
  assert.ok(Math.abs(result.coordinates[0] - 12) < 0.000001);
  assert.ok(Math.abs(result.coordinates[1] - 45) < 0.000001);
  assert.equal(result.released, true);
  assert.equal(result.unchanged, true);
});
