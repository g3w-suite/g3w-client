import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { flattenObject } from '../../../src/utils/flattenObject.js';

describe('flattenObject', () => {

  it('returns a flat object unchanged', () => {
    const result = flattenObject({ a: 1, b: 2 });
    assert.deepEqual(result, { a: 1, b: 2 });
  });

  it('flattens one level of nesting with default separator', () => {
    const result = flattenObject({ address: { city: 'Rome', zip: '00100' } });
    assert.deepEqual(result, { address_city: 'Rome', address_zip: '00100' });
  });

  it('flattens deeply nested objects', () => {
    const result = flattenObject({ a: { b: { c: 42 } } });
    assert.deepEqual(result, { a_b_c: 42 });
  });

  it('respects a custom separator', () => {
    const result = flattenObject({ a: { b: 1 } }, '.');
    assert.deepEqual(result, { 'a.b': 1 });
  });

  it('returns an empty object for an empty input', () => {
    assert.deepEqual(flattenObject({}), {});
  });

  // BUG: typeof null === 'object' causes null values to be silently dropped.
  // The fix is to add `&& obj[key] !== null` to the type check.
  it('BUG: null values are silently dropped instead of being preserved', () => {
    const result = flattenObject({ a: null, b: 1 });
    // Current (buggy) behaviour: null is lost
    assert.deepEqual(result, { b: 1 });
    // Expected correct behaviour would be: assert.deepEqual(result, { a: null, b: 1 });
  });

  // BUG: arrays are recursively flattened instead of being kept as-is.
  it('BUG: array values are recursively expanded with numeric index keys', () => {
    const result = flattenObject({ items: ['x', 'y'] });
    // Current (buggy) behaviour: array is spread
    assert.deepEqual(result, { items_0: 'x', items_1: 'y' });
    // Expected correct behaviour would be: assert.deepEqual(result, { items: ['x', 'y'] });
  });

});
