import assert                        from 'node:assert/strict';
import { Before, Given, When, Then } from '@cucumber/cucumber';

import { areCoordinatesEqual }       from '../../../src/utils/areCoordinatesEqual.js';
import { debounce }                  from '../../../src/utils/debounce.js';
import { distance }                  from '../../../src/utils/distance.js';
import { flattenObject }             from '../../../src/utils/flattenObject.js';
import { getUniqueDomId }            from '../../../src/utils/getUniqueDomId.js';
import { groupBy }                   from '../../../src/utils/groupBy.js';
import { is3DGeometry }              from '../../../src/utils/is3DGeometry.js';
import { noop }                      from '../../../src/utils/noop.js';
import { normalizeEpsg }             from '../../../src/utils/normalizeEpsg.js';
import { throttle }                  from '../../../src/utils/throttle.js';
import { toRawType }                 from '../../../src/utils/toRawType.js';
import { waitFor }                   from '../../../src/utils/waitFor.js';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseDocJson(text) {
  return JSON.parse(text.trim());
}

function parseCellValue(value) {
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  return value;
}

Before(function() {
  this.state = {
    result: undefined,
    reverseResult: undefined,
    callCount: 0,
    lastArgs: undefined,
    ids: [],
    normalizeToString: true,
  };
});

Given('coordinates one is {string}', function(value) {
  this.state.coordinates1 = JSON.parse(value);
});

Given('coordinates two is {string}', function(value) {
  this.state.coordinates2 = JSON.parse(value);
});

When('I run areCoordinatesEqual', function() {
  this.state.result = areCoordinatesEqual(this.state.coordinates1, this.state.coordinates2);
});

Given('distance point one is {string}', function(value) {
  this.state.distance1 = JSON.parse(value);
});

Given('distance point two is {string}', function(value) {
  this.state.distance2 = JSON.parse(value);
});

When('I run distance', function() {
  this.state.result = distance(this.state.distance1, this.state.distance2);
});

When('I run distance in both directions', function() {
  this.state.result = distance(this.state.distance1, this.state.distance2);
  this.state.reverseResult = distance(this.state.distance2, this.state.distance1);
});

Then('both distances are equal', function() {
  assert.equal(this.state.result, this.state.reverseResult);
});

Given('the object to flatten is:', function(docString) {
  this.state.flattenInput = parseDocJson(docString);
});

When('I flatten the object with default separator', function() {
  this.state.result = flattenObject(this.state.flattenInput);
});

When('I flatten the object with separator {string}', function(separator) {
  this.state.result = flattenObject(this.state.flattenInput, separator);
});

Then('the flat object equals:', function(docString) {
  assert.deepEqual(this.state.result, parseDocJson(docString));
});

Given('the array to group is:', function(docString) {
  this.state.groupInput = parseDocJson(docString);
});

Given('the grouping mode is {string}', function(mode) {
  this.state.groupMode = mode;
});

When('I run groupBy', function() {
  const mode = this.state.groupMode;
  let keyFn;

  if ('item.type' === mode) {
    keyFn = item => item.type;
  } else if ('odd-even' === mode) {
    keyFn = value => value % 2 === 0 ? 'even' : 'odd';
  } else if ('identity' === mode) {
    keyFn = value => value;
  } else {
    throw new Error(`Unsupported grouping mode: ${mode}`);
  }

  this.state.result = groupBy(this.state.groupInput, keyFn);
});

Then('the grouped object equals:', function(docString) {
  assert.deepEqual(this.state.result, parseDocJson(docString));
});

Given('the value kind is {string}', function(kind) {
  const factories = {
    string: () => 'hello',
    number: () => 42,
    boolean: () => true,
    null: () => null,
    undefined: () => undefined,
    array: () => [],
    object: () => ({}),
    function: () => (() => {}),
    regexp: () => /x/,
    date: () => new Date('2024-01-01T00:00:00.000Z'),
    map: () => new Map(),
    set: () => new Set(),
  };

  if (!factories[kind]) {
    throw new Error(`Unsupported value kind: ${kind}`);
  }

  this.state.valueInput = factories[kind]();
});

When('I run toRawType', function() {
  this.state.result = toRawType(this.state.valueInput);
});

Given('normalizeEpsg input is number {int}', function(value) {
  this.state.normalizeInput = value;
});

Given('normalizeEpsg input is string {string}', function(value) {
  this.state.normalizeInput = value;
});

Given('normalizeEpsg input is undefined', function() {
  this.state.normalizeInput = undefined;
});

Given('normalizeEpsg CRS object is:', function(docString) {
  this.state.normalizeInput = parseDocJson(docString);
});

Given('normalizeEpsg toString mode is {word}', function(value) {
  this.state.normalizeToString = 'true' === value;
});

When('I run normalizeEpsg', function() {
  this.state.result = normalizeEpsg(this.state.normalizeInput, this.state.normalizeToString);
});

Then('normalizeEpsg result has epsg {string}', function(expected) {
  assert.equal(this.state.result.epsg, expected);
});

Then('normalizeEpsg result has proj4 {string}', function(expected) {
  assert.equal(this.state.result.proj4, expected);
});

Given('geometry type is {string}', function(value) {
  this.state.geometryType = value;
});

When('I run is3DGeometry', function() {
  this.state.result = is3DGeometry(this.state.geometryType);
});

Then('the result match mode is {string}', function(mode) {
  if ('equals-input-string' === mode) {
    assert.equal(this.state.result, this.state.geometryType);
    return;
  }
  if ('undefined' === mode) {
    assert.equal(this.state.result, undefined);
    return;
  }
  throw new Error(`Unsupported match mode: ${mode}`);
});

When('I run noop with sample arguments', function() {
  assert.doesNotThrow(() => {
    this.state.result = noop(1, 'two', null, {});
  });
});

Then('the result is undefined', function() {
  assert.equal(this.state.result, undefined);
});

Then('the result is null', function() {
  assert.equal(this.state.result, null);
});

Then('the boolean result is true', function() {
  assert.equal(this.state.result, true);
});

Then('the boolean result is false', function() {
  assert.equal(this.state.result, false);
});

Then('the numeric result equals {int}', function(value) {
  assert.equal(this.state.result, value);
});

Then('the numeric result is approximately {float} with tolerance {float}', function(expected, tolerance) {
  assert.ok(Math.abs(this.state.result - expected) < tolerance);
});

Then('the string result equals {string}', function(expected) {
  assert.equal(this.state.result, expected);
});

Given('a debounced function with delay {int} milliseconds', function(delayMs) {
  this.state.callCount = 0;
  this.state.lastArgs = undefined;
  this.state.debounced = debounce((...args) => {
    this.state.callCount += 1;
    this.state.lastArgs = args;
  }, delayMs);
});

Given('a debounced function with default delay', function() {
  this.state.callCount = 0;
  this.state.lastArgs = undefined;
  this.state.debounced = debounce((...args) => {
    this.state.callCount += 1;
    this.state.lastArgs = args;
  });
});

When('I call the debounced function with {string}', function(value) {
  this.state.debounced(value);
});

When('I wait {int} milliseconds', async function(ms) {
  await sleep(ms);
});

Then('the wrapped function call count is {int}', function(count) {
  assert.equal(this.state.callCount, count);
});

Then('the last wrapped function arguments are:', function(table) {
  const expectedArgs = table.raw().flat().map(parseCellValue);
  assert.deepEqual(this.state.lastArgs, expectedArgs);
});

Given('a throttled function with delay {int} milliseconds', function(delayMs) {
  this.state.callCount = 0;
  this.state.lastArgs = undefined;
  this.state.throttled = throttle((...args) => {
    this.state.callCount += 1;
    this.state.lastArgs = args;
  }, delayMs);
});

When('I call the throttled function with {string}', function(value) {
  this.state.throttled(value);
});

When('I call the throttled function with values:', function(table) {
  const args = table.raw().flat().map(parseCellValue);
  this.state.throttled(...args);
});

Given('the waitFor predicate is always true', function() {
  this.state.waitPredicate = () => true;
});

Given('the waitFor predicate is always false', function() {
  this.state.waitPredicate = () => false;
});

Given('the waitFor predicate starts false and becomes true after {int} milliseconds', function(ms) {
  const startedAt = Date.now();
  this.state.waitPredicate = () => (Date.now() - startedAt) >= ms;
});

When('I run waitFor without timeout', async function() {
  this.state.result = await waitFor(this.state.waitPredicate);
});

When('I run waitFor with timeout {int} milliseconds', async function(timeoutMs) {
  try {
    this.state.result = await waitFor(this.state.waitPredicate, timeoutMs);
    this.state.waitError = undefined;
  } catch (error) {
    this.state.waitError = error;
  }
});

Then('waitFor resolves with value {string}', function(expected) {
  assert.equal(this.state.result, expected);
});

Then('waitFor rejects with message containing {string}', function(fragment) {
  assert.ok(this.state.waitError);
  assert.match(String(this.state.waitError), new RegExp(fragment));
});

When('I generate {int} unique DOM ids', function(count) {
  this.state.ids = Array.from({ length: count }, () => getUniqueDomId());
});

Then('every generated id matches the pattern {string}', function(pattern) {
  const regex = new RegExp(pattern);
  for (const id of this.state.ids) {
    assert.match(id, regex);
  }
});

Then('all generated ids are unique', function() {
  assert.equal(new Set(this.state.ids).size, this.state.ids.length);
});

Then('the counter in the second id is exactly 1 more than the first id', function() {
  const first = parseInt(this.state.ids[0].split('_')[0], 10);
  const second = parseInt(this.state.ids[1].split('_')[0], 10);
  assert.equal(second - first, 1);
});
