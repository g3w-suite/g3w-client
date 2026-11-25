const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Given, When, Then } = require('@cucumber/cucumber');
const { parseSync } = require('@babel/core');
const { parse: parseVue } = require('@vue/compiler-sfc');

function sourceOf(filename) {
  const source = readFileSync(path.join(__dirname, '../..', filename), 'utf8');
  return filename.endsWith('.vue') ? parseVue({ source, filename }).script.content : source;
}

function findSource(filename, predicate) {
  const source = sourceOf(filename);
  const pending = [parseSync(source, { babelrc: false, configFile: false, sourceType: 'module' })];
  while (pending.length) {
    const node = pending.pop();
    if (predicate(node, source)) {
      return source.slice(node.start, node.end);
    }
    pending.push(...Object.values(node).flat().filter(value => value && 'object' === typeof value).reverse());
  }
  assert.fail(`Missing test target in ${filename}`);
}

function method(filename, name, contains = '') {
  const source = findSource(filename, (node, code) => ['ObjectMethod', 'ClassMethod'].includes(node.type) && node.key.name === name && code.slice(node.start, node.end).includes(contains));
  return new Function(`return ({ ${source} })`)()[name];
}

Given('the field type handlers are loaded', function () {
  this.classifiers = ['src/components/QueryResults.vue', 'src/components/Relations.vue', 'src/components/Table.vue', 'src/g3w-globals.js']
    .map(filename => [filename, method(filename, filename.endsWith('g3w-globals.js') ? 'getType' : 'getFieldType')]);
});

When('I classify empty, wrapped, geometry, Vue and array values', function () {
  this.classifications = this.classifiers.map(([filename, classify]) => ({
    filename,
    empty: [undefined, null, '', 0, false, {}, [], [1], { value: null }, { value: 0 }]
      .map(value => classify({ type: 'simple', value })),
    media: classify({ value: { value: 'https://example.com/file.png' } }),
    photos: filename.endsWith('Relations.vue') ? classify({ value: [{ photo: 'image.png' }] }) : null,
    geometry: classify({ value: { coordinates: [1, 2] } }),
    vue: classify({ value: { vue: true } }),
  }));
});

Then('each field type is preserved', function () {
  for (const result of this.classifications) {
    assert.deepEqual(result.empty, Array(10).fill('simple_field'), result.filename);
    assert.equal(result.media, 'photo_field', result.filename);
    if (result.filename.endsWith('Relations.vue')) assert.equal(result.photos, 'photo_field', result.filename);
    assert.equal(result.geometry, 'geo_field', result.filename);
    assert.equal(result.vue, 'vue_field', result.filename);
  }
});

Given('the JSON detector and plugin configuration handler are loaded', function () {
  this.isJSON = method('src/components/QueryResults.vue', 'isJSON');
  this.setConfig = method('src/g3w-plugin.js', 'setConfig');
});

When('I check JSON values and plugin configurations', function () {
  const context = { isVue: () => false, isSimple: () => true };
  this.jsonResults = [null, undefined, [], '', 0, false, new Date(), new Map(), new Set(), /pattern/, {}]
    .map(value => this.isJSON.call(context, { value }));
  this.plugin = {};
  this.invalidConfigs = [null, [], '', 0, false, new Date(), new Map(), new Set(), /pattern/]
    .map(value => {
      this.setConfig.call(this.plugin, value);
      return this.plugin.config;
    });
  this.config = { enabled: true };
  this.setConfig.call(this.plugin, this.config);
  this.configuredValue = this.plugin.config;
  this.defaultConfig = {};
  this.setConfig.call(this.plugin);
});

Then('only plain objects are accepted', function () {
  assert.deepEqual(this.jsonResults, [...Array(10).fill(false), true]);
  assert.deepEqual(this.invalidConfigs, Array(9).fill(null));
  assert.equal(this.configuredValue, this.config);
  assert.deepEqual(this.plugin.config, this.defaultConfig);
});

Given('the search value normalizer is loaded', function () {
  const source = findSource('src/components/g3w-search.js', node => node.type === 'ArrowFunctionExpression' && node.params[0]?.name === 'value' && node.body.type === 'ConditionalExpression');
  this.normalize = new Function(`return (${source})`)();
});

When('I normalize options and scalar values', function () {
  this.option = { key: 1, value: 'One' };
  this.normalizedOption = this.normalize(this.option);
  this.searchValues = [null, undefined, '', 0, false, [], new Date(), new Map(), new Set(), /pattern/];
  this.normalizedValues = this.searchValues.map(value => this.normalize(value));
});

Then('existing options are preserved and scalars are wrapped', function () {
  assert.equal(this.normalizedOption, this.option);
  for (const [index, value] of this.searchValues.entries()) {
    assert.deepEqual(this.normalizedValues[index], { key: value, value });
  }
});

Given('the media input watcher is loaded', function () {
  this.inputValue = method('src/components/G3WField.vue', 'inputValue', 'this.state.update');
});

When('I compare media values with their originals', function () {
  this.mediaChanges = [
    [null, null, false],
    [{ value: null }, null, false],
    [{ value: 0 }, 0, false],
    [{ value: '' }, '', false],
    [{ value: 'new' }, { value: 'old' }, true],
    [[], [], true],
  ].map(([value, original]) => {
    const context = {
      inputValueWatchReady: true,
      state: { input: { type: 'media' }, value, _value: original, validate: {} },
      validate() {},
      forwardChangeInput() {},
    };
    this.inputValue.call(context);
    return context.state.update;
  });
});

Then('only changed media values are marked updated', function () {
  assert.deepEqual(this.mediaChanges, [false, false, false, false, true, true]);
});

Given('the error formatter is loaded', function () {
  const source = findSource('src/g3w-app.js', node => node.type === 'ClassPrivateMethod' && node.key.id.name === 'errorToMessage');
  const Formatter = new Function(`return class { ${source} format(error) { return this.#errorToMessage(error); } }`)();
  this.formatError = error => new Formatter().format(error);
});

When('I format native, cross-realm and response errors', function () {
  this.errorMessages = [
    this.formatError(new TypeError('invalid')),
    this.formatError(vm.runInNewContext('new Error("cross-realm")')),
    this.formatError(null),
    this.formatError(undefined),
    this.formatError({ responseText: 'Failed' }),
    this.formatError({ responseJSON: { result: false, error: { code: 'bad', data: 'field', message: 'invalid' } } }),
    this.formatError([new Error('first'), ['second']]),
  ];
});

Then('each error is converted to the expected message', function () {
  assert.deepEqual(this.errorMessages, [
    'CLIENT - invalid',
    'CLIENT - cross-realm',
    'server_error',
    'server_error',
    'Failed',
    'BAD field invalid',
    'CLIENT - first second',
  ]);
});

Given('the deprecated type utility is loaded', function () {
  this.utilitySource = sourceOf('src/utils/toRawType.js');
});

When('I inspect its SDK export', async function () {
  this.toRawType = (await import(`data:text/javascript,${encodeURIComponent(this.utilitySource)}`)).toRawType;
  this.globalsSource = sourceOf('src/g3w-globals.js');
});

Then('it remains documented and callable', function () {
  assert.match(this.utilitySource, /@deprecated/);
  assert.equal(this.toRawType(null), 'Null');
  assert.equal(this.toRawType([]), 'Array');
  assert.equal(this.toRawType({}), 'Object');
  assert.match(this.globalsSource, /import \{ toRawType \}/);
  assert.match(this.globalsSource, /^\s+toRawType,$/m);
});
