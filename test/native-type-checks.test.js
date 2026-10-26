const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { parse } = require('@babel/parser');
const { parse: parseVue } = require('@vue/compiler-sfc');

function sourceOf(filename) {
  const source = readFileSync(path.join(__dirname, '..', filename), 'utf8');
  return filename.endsWith('.vue') ? parseVue({ source, filename }).script.content : source;
}

function findSource(filename, predicate) {
  const source = sourceOf(filename);
  const pending = [parse(source, { sourceType: 'module' })];
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
  const source = findSource(filename, (node, source) => ['ObjectMethod', 'ClassMethod'].includes(node.type) && node.key.name === name && source.slice(node.start, node.end).includes(contains));
  return new Function(`return ({ ${source} })`)()[name];
}

test('field classification preserves wrapped, empty, geometry, Vue and array values', () => {
  for (const filename of ['src/components/QueryResults.vue', 'src/components/Relations.vue', 'src/components/Table.vue', 'src/g3w-globals.js']) {
    const classify = method(filename, filename.endsWith('g3w-globals.js') ? 'getType' : 'getFieldType');
    for (const value of [undefined, null, '', 0, false, {}, [], [1], { value: null }, { value: 0 }]) {
      assert.equal(classify({ type: 'simple', value }), 'simple_field', filename);
    }
    assert.equal(classify({ value: { value: 'https://example.com/file.png' } }), 'photo_field', filename);
    assert.equal(classify({ value: { coordinates: [1, 2] } }), 'geo_field', filename);
    assert.equal(classify({ value: { vue: true } }), 'vue_field', filename);
  }
});

test('JSON fields exclude null, arrays and primitive values', () => {
  const isJSON = method('src/components/QueryResults.vue', 'isJSON');
  const context = { isVue: () => false, isSimple: () => true };
  for (const value of [null, undefined, [], '', 0, false, new Date(), new Map(), new Set(), /pattern/]) {
    assert.equal(isJSON.call(context, { value }), false);
  }
  assert.equal(isJSON.call(context, { value: {} }), true);
});

test('plugin configuration accepts objects but not arrays or primitive values', () => {
  const setConfig = method('src/g3w-plugin.js', 'setConfig');
  const plugin = {};
  for (const value of [null, [], '', 0, false, new Date(), new Map(), new Set(), /pattern/]) {
    setConfig.call(plugin, value);
    assert.equal(plugin.config, null);
  }
  const config = { enabled: true };
  setConfig.call(plugin, config);
  assert.equal(plugin.config, config);
  setConfig.call(plugin);
  assert.deepEqual(plugin.config, {});
});

test('search values preserve key/value objects and wrap scalar or array values', () => {
  const source = findSource('src/components/g3w-search.js', node => node.type === 'ArrowFunctionExpression' && node.params[0]?.name === 'value' && node.body.type === 'ConditionalExpression');
  const normalize = new Function(`return (${source})`)();
  const option = { key: 1, value: 'One' };
  assert.equal(normalize(option), option);
  for (const value of [null, undefined, '', 0, false, [], new Date(), new Map(), new Set(), /pattern/]) {
    assert.deepEqual(normalize(value), { key: value, value });
  }
});

test('media changes compare wrapped values without losing null or falsy values', () => {
  const inputValue = method('src/components/G3WField.vue', 'inputValue', 'this.state.update');
  for (const [value, original, changed] of [[null, null, false], [{ value: null }, null, false], [{ value: 0 }, 0, false], [{ value: '' }, '', false], [{ value: 'new' }, { value: 'old' }, true], [[], [], true]]) {
    const context = {
      inputValueWatchReady: true,
      state: { input: { type: 'media' }, value, _value: original, validate: {} },
      validate() {},
      forwardChangeInput() {},
    };
    inputValue.call(context);
    assert.equal(context.state.update, changed);
  }
});

test('error formatting handles native errors, response objects and nested arrays', () => {
  const source = findSource('src/g3w-app.js', node => node.type === 'ClassPrivateMethod' && node.key.id.name === 'errorToMessage');
  const Formatter = new Function(`return class { ${source} format(error) { return this.#errorToMessage(error); } }`)();
  const formatter = new Formatter();
  assert.equal(formatter.format(new TypeError('invalid')), 'CLIENT - invalid');
  assert.equal(formatter.format(null), 'server_error');
  assert.equal(formatter.format(undefined), 'server_error');
  assert.equal(formatter.format({ responseText: 'Failed' }), 'Failed');
  assert.equal(formatter.format({ responseJSON: { result: false, error: { code: 'bad', data: 'field', message: 'invalid' } } }), 'BAD field invalid');
  assert.equal(formatter.format([new Error('first'), ['second']]), 'CLIENT - first second');
});

test('deprecated utility remains available to SDK consumers', async () => {
  const source = sourceOf('src/utils/toRawType.js');
  assert.match(source, /@deprecated/);
  const { toRawType } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
  assert.equal(toRawType(null), 'Null');
  assert.equal(toRawType([]), 'Array');
  assert.equal(toRawType({}), 'Object');
  const globals = sourceOf('src/g3w-globals.js');
  assert.match(globals, /import \{ toRawType \}/);
  assert.match(globals, /^\s+toRawType,$/m);
});