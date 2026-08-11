import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { is3DGeometry } from '../../../src/utils/is3DGeometry.js';

describe('is3DGeometry', () => {

  it('returns a truthy value for a known 3D type', () => {
    assert.ok(is3DGeometry('PointZ'));
    assert.ok(is3DGeometry('PolygonZM'));
    assert.ok(is3DGeometry('MultiPolygon25D'));
    assert.ok(is3DGeometry('LineStringM'));
  });

  it('returns a falsy value for a non-3D type', () => {
    assert.equal(is3DGeometry('Point'), undefined);
    assert.equal(is3DGeometry('Polygon'), undefined);
    assert.equal(is3DGeometry('MultiLineString'), undefined);
    assert.equal(is3DGeometry(''), undefined);
    assert.equal(is3DGeometry(undefined), undefined);
  });

  // BUG: Array.find() returns the matched string, not a boolean.
  // Callers that do `if (is3DGeometry(type))` work, but strict boolean checks fail.
  // Fix: return !!TYPES.find(...) or TYPES.includes(geometryType).
  it('BUG: returns the matched string instead of true for 3D types', () => {
    assert.equal(is3DGeometry('PointZ'), 'PointZ');   // returns string, not true
    assert.notEqual(is3DGeometry('PointZ'), true);    // strict boolean fails
  });

  it('returns undefined (not false) for unknown types', () => {
    assert.equal(is3DGeometry('Unknown'), undefined);
  });

});
