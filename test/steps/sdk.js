const assert = require('node:assert/strict');
const { Then } = require('@cucumber/cucumber');

Then('legacy feature copies preserve editing state without sharing cloned geometry', async function () {
  const result = await this.corePage.evaluate(() => {
    const Feature = g3wsdk.core.layer.features.Feature;
    const original = new ol.Feature({ geometry: new ol.geom.Point([10, 20]), name: 'Station', pk: 7 });
    original.setId('roads.7');
    const feature = new Feature({ feature: original });
    feature.update();
    const copy = feature.clone();
    copy.getGeometry().setCoordinates([30, 40]);
    const added = feature.cloneNew({ name: 'pk', editable: false });
    added.add();
    const selected = new Feature({ feature: original, properties: ['name'] });
    const snapshot = {
      copied: { id: copy.getId(), uid: copy.getUid() === feature.getUid(), state: copy.getState() },
      originalGeometry: feature.getGeometry().getCoordinates(), clonedGeometry: copy.getGeometry().getCoordinates(),
      geometry: feature.isGeometry(), attributes: feature.getAlphanumericProperties(),
      added: [added.isNew(), added.isAdded(), added.get('pk'), added.getId().startsWith('_new_')],
      newUid: added.getUid() !== feature.getUid(),
      selected: selected.getAlphanumericProperties(),
    };
    feature.delete();
    snapshot.deleted = feature.isDeleted();
    feature.update();
    snapshot.updated = feature.isUpdated();
    feature.setVisible(false);
    snapshot.hidden = feature.isVisible();
    feature.setVisible();
    snapshot.visible = feature.isVisible();
    added.clearState();
    snapshot.cleared = [added.isNew(), added.getState()];
    return snapshot;
  });
  assert.deepEqual(result, {
    copied: { id: 'roads.7', uid: true, state: 'update' },
    originalGeometry: [10, 20], clonedGeometry: [30, 40], geometry: true,
    attributes: { name: 'Station', pk: 7 }, added: [true, true, null, true], newUid: true,
    selected: { name: 'Station' }, deleted: true, updated: true, hidden: false, visible: true,
    cleared: [false, null],
  });
});

Then('legacy field helpers classify media and extract nested validation messages', async function () {
  const result = await this.corePage.evaluate(() => {
    const { FieldsService, vue } = g3wsdk.gui;
    const View = Vue.extend({
      mixins: [vue.Mixins.fieldsMixin, vue.Mixins.mediaMixin],
      data: () => ({ value: '/files/report.pdf' }), template: '<output>{{ filename }}</output>',
    });
    const view = new View().$mount();
    const plain = { value: 'Station' }, link = { value: 'https://maps.test/info' };
    const photo = { value: 'https://maps.test/photo.png' }, embedded = { type: 'vue', value: {} };
    const snapshot = {
      types: [view.getFieldType(plain), view.getFieldType(link), view.getFieldType(photo),
        view.getFieldType({ value: { coordinates: [1, 2] } }), view.getFieldType(embedded)],
      predicates: [view.isSimple(plain), view.isLink(link), view.isImage(photo), view.isPhoto(photo), view.isVue(embedded)],
      sanitized: [view.sanitizeFieldValue([]), view.sanitizeFieldValue(['a'])],
      filename: view.$el.textContent,
      media: [view.isMedia({ mime_type: 'application/pdf' }), view.isMedia('report.pdf')],
      formats: ['image/png', 'application/pdf', 'video/mp4', 'application/zip', 'application/msword',
        'application/vnd.ms-office', 'application/vnd.ms-powerpoint', 'unknown']
        .map(type => view.getMediaType(type)),
    };
    FieldsService.add({ type: 'offline_field', field: { name: 'offline-renderer' } });
    snapshot.registered = vue.Fields.offline_field.name;
    FieldsService.remove('offline_field');
    snapshot.removed = !Object.hasOwn(vue.Fields, 'offline_field');
    const parse = error => new g3wsdk.core.errors.parsers.Server({ error }).parse();
    snapshot.errors = [
      parse({ responseJSON: { error: { message: 'Save rejected' } } }),
      parse({ errors: { nested: { record: { fields: { name: ['Required.'], count: 'Invalid:' } } } } }),
      parse({ errors: { record: { fields: 'Invalid.', fid: 7 } } }),
      new g3wsdk.core.errors.parsers.Server({ error: 'Offline' }).parse({ type: 'String' }),
    ];
    const empty = new (Vue.extend(vue.Inputs.G3wFormInputs))();
    snapshot.defaultFields = empty.state.fields;
    empty.$destroy();
    view.$destroy();
    return snapshot;
  });
  assert.deepEqual(result, {
    types: ['simple_field', 'link_field', 'photo_field', 'geo_field', 'vue_field'],
    predicates: [true, true, false, true, true], sanitized: ['', ['a']], filename: 'report.pdf',
    media: [true, false],
    formats: [
      { type: 'image', options: {} }, { type: 'pdf', options: {} },
      { type: 'video', options: { format: 'video/mp4' } }, { type: 'zip', options: {} },
      { type: 'text', options: {} }, { type: 'excel', options: {} },
      { type: 'ppt', options: {} }, { type: 'unknow', options: {} },
    ],
    registered: 'offline-renderer', removed: true,
    errors: ['Save rejected', 'name Required\ncount Invalid\n', '[fid] Invalid', 'Offline'], defaultFields: [],
  });
});

Then('legacy map and resize mixins follow a mounted plugin view lifecycle', async function () {
  const page = this.corePage;
  const initial = await page.evaluate(async () => {
    const before = g3w.app.getMap().getLayers().getLength();
    window.sdkResizeCalls = 0;
    window.sdkMapView = new Vue({
      mixins: [g3wsdk.gui.vue.Mixins.geoMixin, g3wsdk.gui.vue.Mixins.resizeMixin],
      data: {
        data: { type: 'Point', coordinates: [1, 2] }, visible: true, delayType: 'debounce', delayTime: 0,
      },
      methods: { resize() { sdkResizeCalls++; } },
      template: '<button id="sdk-geometry" @click="showLayer">Toggle plugin geometry</button>',
    }).$mount();
    await g3w.app.showContent({ content: sdkMapView.$el, title: 'Plugin geometry', perc: 50 });
    await Vue.nextTick();
    await coreTestExports.waitFor(() => sdkResizeCalls > 0, 1000);
    return {
      before, after: g3w.app.getMap().getLayers().getLength(),
      geometry: ol.proj.toLonLat(sdkMapView.layer.getSource().getFeatures()[0].getGeometry().getCoordinates()),
    };
  });
  assert.equal(initial.after, initial.before + 1);
  assert.ok(Math.abs(initial.geometry[0] - 1) < 1e-8);
  assert.ok(Math.abs(initial.geometry[1] - 2) < 1e-8);
  await page.locator('#sdk-geometry').click();
  assert.equal(await page.evaluate(() => sdkMapView.layer.getVisible()), false);
  const result = await page.evaluate(async () => {
    const before = sdkResizeCalls;
    g3w.app.emit('resize');
    await coreTestExports.waitFor(() => sdkResizeCalls > before, 1000);
    sdkMapView.$destroy();
    sdkMapView.$el.remove();
    await g3w.app.closeContent();
    return { layers: g3w.app.getMap().getLayers().getLength(), delay: sdkMapView.delayResize };
  });
  assert.deepEqual(result, { layers: initial.before, delay: null });
});

Then('legacy form validation restores mutually exclusive inputs and enforces bounds', async function () {
  const result = await this.corePage.evaluate(async () => {
    const view = new Vue({
      mixins: [g3wsdk.gui.vue.Mixins.formInputsMixins],
      data: { state: { valid: true } }, template: '<form></form>',
    }).$mount();
    const first = { name: '0', value: 'A', validate: { valid: true, empty: false, required: false, mutually: ['1'] } };
    const second = { name: '1', value: null, validate: { valid: true, empty: true, required: false, mutually: ['0'] } };
    view.addToValidate(first);
    view.addToValidate(second);
    view.changeInput(first);
    const exclusive = view.valid;
    second.value = 'B';
    second.validate.empty = false;
    view.changeInput(second);
    const both = view.valid;
    first.value = '';
    first.validate.empty = true;
    view.changeInput(first);
    await coreTestExports.waitFor(() => second.validate.valid, 1000);
    const restored = [first.value, first.validate.valid, second.validate.valid, view.valid];
    delete second.validate.mutually;
    first.value = 10;
    first.validate.empty = false;
    second.value = 20;
    second.validate.min_field = '0';
    view.changeInput(second);
    const aboveMinimum = view.valid;
    second.value = 5;
    view.changeInput(second);
    const belowMinimum = view.valid;
    delete second.validate.min_field;
    second.validate.max_field = '0';
    view.changeInput(second);
    const belowMaximum = view.valid;
    view.$destroy();
    return { exclusive, both, restored, aboveMinimum, belowMinimum, belowMaximum, released: view.tovalidate };
  });
  assert.deepEqual(result, {
    exclusive: true, both: false, restored: [null, true, true, true],
    aboveMinimum: true, belowMinimum: false, belowMaximum: true, released: null,
  });
});

Then('legacy input mixins synchronize a real select widget and plugin service', async function () {
  const page = this.corePage;
  await page.evaluate(async () => {
    const mixins = g3wsdk.gui.vue.Mixins;
    window.sdkInputEvents = [];
    window.sdkInputView = new Vue({
      mixins: [mixins.baseInputMixin, mixins.selectMixin, mixins.select2Mixin],
      data: {
        state: {
          value: 'A', editable: true, help: { message: ' Choose a value ', visible: false },
          validate: { valid: true },
          input: { type: 'select_autocomplete', options: {
            usecompleter: true, loading: { state: 'ready' },
            values: [{ value: null, label: 'None' }, { value: 'A', label: 'Alpha' }, { value: 'B', label: 'Beta' }],
          } },
        },
        select2: null, delayTime: 0,
        service: {
          setEmpty() { sdkInputEvents.push('empty'); },
          validate() { sdkInputEvents.push('validate'); },
          setUpdate() { sdkInputEvents.push('update'); },
        },
      },
      template: `<section id="sdk-input">
        <select ref="select">
          <option v-for="option in state.input.options.values" :value="getValue(option.value)">{{ option.label }}</option>
        </select>
        <input aria-label="Mobile value" @input="mobileChange" />
        <button id="sdk-help" @click="showHideHelp">Help</button>
        <button id="sdk-reset" @click="resetValues">Reset</button>
        <output>{{ autocomplete }} {{ disabled }} {{ tabIndex }} {{ showhelpicon }}</output>
      </section>`,
      mounted() {
        this.select2 = $(this.$refs.select).select2({ language: this.getLanguage() })
          .on('change', event => this.changeSelect(event.target.value));
      },
    }).$mount();
    sdkInputView.$on('changeinput', state => sdkInputEvents.push(state.value));
    await g3w.app.showContent({ content: sdkInputView.$el, title: 'Plugin input', perc: 50 });
    await Vue.nextTick();
  });
  await page.locator('#sdk-input [role="combobox"]').click();
  await page.getByRole('option', { name: 'Beta', exact: true }).click();
  await page.waitForFunction(() => sdkInputEvents.includes('B'));
  await page.locator('#sdk-help').click();
  await page.getByRole('textbox', { name: 'Mobile value' }).fill('C');
  const result = await page.evaluate(async () => {
    const view = sdkInputView;
    view.setLoading(true);
    const loading = [view.disabled, view.loadingState];
    view.setLoading(false);
    view.state.validate.valid = false;
    await Vue.nextTick();
    await Vue.nextTick();
    const invalid = view.select2.data('select2').$container.hasClass('input-error-validation');
    view.state.validate.valid = true;
    view.state.value = 'A';
    view.setValue();
    await Vue.nextTick();
    const value = view.select2.val();
    view.state.editable = false;
    await Vue.nextTick();
    return { loading, invalid, value, disabled: view.disabled, tabIndex: view.tabIndex,
      help: view.state.help.visible, events: sdkInputEvents.slice() };
  });
  assert.deepEqual(result.loading, [true, 'loading']);
  assert.equal(result.invalid, true);
  assert.equal(result.value, 'A');
  assert.equal(result.disabled, true);
  assert.equal(result.tabIndex, -1);
  assert.equal(result.help, true);
  assert.deepEqual(result.events, ['empty', 'validate', 'update', 'B', 'empty', 'validate', 'update', 'C', 'empty', 'validate', 'update', 'A']);
  await page.locator('#sdk-reset').click();
  assert.equal(await page.locator('#sdk-input select option').count(), 0);
  assert.equal(await page.evaluate(() => { sdkInputView.$destroy(); return sdkInputView.select2; }), null);
});

Then('production date and range widgets publish changes and react to parent updates', async function () {
  const result = await this.corePage.evaluate(async () => {
    const changes = [];
    const DateWidget = Vue.component('datetime');
    const date = new DateWidget({ propsData: { value: '2024-01-15' } }).$mount();
    document.body.append(date.$el);
    date.$on('change', value => changes.push(value));
    await Vue.nextTick();
    date.$props.minDate = '2024-01-01';
    date.$props.maxDate = '2024-01-31';
    date.$props.enabledDates = ['2024-01-15', '2024-01-20'];
    date.$props.value = '2024-01-20';
    await Vue.nextTick();
    await Vue.nextTick();
    const input = date.$el.querySelector('input');
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const dateValue = input.value;
    const RangeWidget = Vue.component('range');
    const range = new RangeWidget({ propsData: { id: 'sdk-range', value: 2, min: 0, max: 10 } }).$mount();
    document.body.append(range.$el);
    range.$on('change-range', value => changes.push(value));
    await Vue.nextTick();
    const slider = range.$el.querySelector('input');
    slider.value = '7';
    slider.dispatchEvent(new Event('change', { bubbles: true }));
    await coreTestExports.waitFor(() => changes.some(value => value?.value === 7), 1000);
    range.setValue(8);
    await coreTestExports.waitFor(() => changes.some(value => value?.value === 8), 1000);
    range.$props.value = 4;
    await Vue.nextTick();
    const sync = new RangeWidget({ propsData: { id: 'sdk-sync', value: 1, sync: true } }).$mount();
    sync.$on('changed', () => changes.push('changed'));
    sync.setValue(3);
    await Vue.nextTick();
    const font = Vue.prototype.g3wtemplate;
    const icons = [font.addFontClass({ name: 'sdk-test', className: 'fas fa-car' }),
      font.addFontClass({ name: 'sdk-test', className: 'ignored' }), font.getFontClass('sdk-test')];
    const snapshot = { dateValue, changes, rangeValue: range.state.value, background: slider.style.backgroundSize, icons };
    date.datetimeinputelement.datetimepicker('hide');
    for (const widget of [date, range, sync]) { widget.$destroy(); widget.$el.remove(); }
    return snapshot;
  });
  assert.equal(result.dateValue, '2024-01-20');
  assert.ok(result.changes.includes('2024-01-20'));
  assert.ok(result.changes.includes('changed'));
  assert.ok(result.changes.some(change => change?.id === 'sdk-range' && change.value === 7));
  assert.ok(result.changes.some(change => change?.id === 'sdk-range' && change.value === 8));
  assert.equal(result.rangeValue, 4);
  assert.equal(result.background, '40% 100%');
  assert.deepEqual(result.icons, [true, false, 'fas fa-car']);
});
