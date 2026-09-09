import { describe, it } from 'node:test';
import assert           from 'node:assert/strict';

// Re-import the module freshly for each test to reset the module-level counter.
// node:test runs each file in a separate worker so the counter starts at 0 per file,
// but within a file we must import once and accept sequential values.
import { getUniqueDomId } from '../../../src/utils/getUniqueDomId.js';

describe('getUniqueDomId', () => {

  it('returns a non-empty string', () => {
    const id = getUniqueDomId();
    assert.equal(typeof id, 'string');
    assert.ok(id.length > 0);
  });

  it('returns a unique value on every call', () => {
    const ids = new Set(Array.from({ length: 50 }, () => getUniqueDomId()));
    assert.equal(ids.size, 50);
  });

  it('has the format "<counter>_<timestamp>"', () => {
    const id = getUniqueDomId();
    assert.match(id, /^\d+_\d+$/);
  });

  it('counter portion increments by 1 on each call', () => {
    const a = getUniqueDomId();
    const b = getUniqueDomId();
    const counterA = parseInt(a.split('_')[0], 10);
    const counterB = parseInt(b.split('_')[0], 10);
    assert.equal(counterB - counterA, 1);
  });

});
