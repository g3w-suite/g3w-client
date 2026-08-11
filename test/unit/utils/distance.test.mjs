import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { distance } from '../../../src/utils/distance.js';

describe('distance', () => {

  it('returns 0 for the same point', () => {
    assert.equal(distance([0, 0], [0, 0]), 0);
  });

  it('computes horizontal distance', () => {
    assert.equal(distance([0, 0], [3, 0]), 3);
  });

  it('computes vertical distance', () => {
    assert.equal(distance([0, 0], [0, 4]), 4);
  });

  it('computes a 3-4-5 Pythagorean triple', () => {
    assert.equal(distance([0, 0], [3, 4]), 5);
  });

  it('is symmetric', () => {
    const a = [1, 2];
    const b = [4, 6];
    assert.equal(distance(a, b), distance(b, a));
  });

  it('works with negative coordinates', () => {
    assert.equal(distance([-3, 0], [0, -4]), 5);
  });

  it('returns a float for non-integer results', () => {
    const d = distance([0, 0], [1, 1]);
    assert.ok(Math.abs(d - Math.SQRT2) < 1e-10);
  });

});
