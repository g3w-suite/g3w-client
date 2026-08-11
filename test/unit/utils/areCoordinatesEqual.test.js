import { describe, it }        from 'node:test';
import assert                  from 'node:assert/strict';
import { areCoordinatesEqual } from '../../../src/utils/areCoordinatesEqual.js';

describe('areCoordinatesEqual', () => {

  it('returns true when both x and y match', () => {
    assert.ok(areCoordinatesEqual([10, 20], [10, 20]));
  });

  it('returns false when x differs', () => {
    assert.equal(areCoordinatesEqual([10, 20], [99, 20]), false);
  });

  it('returns false when y differs', () => {
    assert.equal(areCoordinatesEqual([10, 20], [10, 99]), false);
  });

  it('returns false when both differ', () => {
    assert.equal(areCoordinatesEqual([10, 20], [30, 40]), false);
  });

  it('ignores the Z component (only x and y are compared)', () => {
    assert.ok(areCoordinatesEqual([1, 2, 3], [1, 2, 99]));
  });

  it('returns true for default empty arrays (both undefined → undefined === undefined)', () => {
    assert.ok(areCoordinatesEqual());
  });

  it('handles floating-point coordinates', () => {
    assert.ok(areCoordinatesEqual([12.345678, 45.678901], [12.345678, 45.678901]));
  });

});
