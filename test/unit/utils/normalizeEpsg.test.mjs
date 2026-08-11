import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEpsg } from '../../../src/utils/normalizeEpsg.js';

describe('normalizeEpsg — toString mode (default)', () => {

  it('converts a numeric EPSG to "EPSG:N" string', () => {
    assert.equal(normalizeEpsg(4326), 'EPSG:4326');
    assert.equal(normalizeEpsg(3857), 'EPSG:3857');
  });

  it('normalizes an already-formatted string', () => {
    assert.equal(normalizeEpsg('EPSG:4326'), 'EPSG:4326');
    assert.equal(normalizeEpsg('epsg:4326'), 'EPSG:4326');
  });

  it('normalizes a bare numeric string', () => {
    assert.equal(normalizeEpsg('4326'), 'EPSG:4326');
  });

  it('strips non-numeric characters and parses the number', () => {
    assert.equal(normalizeEpsg('urn:ogc:def:crs:EPSG::4326'), 'EPSG:4326');
  });

  it('returns undefined when the string has no digits', () => {
    // parseInt('') is NaN → `EPSG:NaN` is NOT returned because '' !== '' is false — actually '' === '' is true so the block is skipped
    // the function returns undefined for empty string after stripping
    assert.equal(normalizeEpsg('abc'), undefined);
  });

});

describe('normalizeEpsg — CRS object mode (toString=false)', () => {

  it('returns null for undefined input', () => {
    assert.equal(normalizeEpsg(undefined, false), null);
  });

  it('returns null for null input', () => {
    assert.equal(normalizeEpsg(null, false), null);
  });

  it('enriches a CRS object that already has an epsg property', () => {
    const crs = { epsg: 4326, proj4: '+proj=longlat', axisinverted: true, geographic: true };
    const result = normalizeEpsg(crs, false);
    assert.equal(result.epsg, 'EPSG:4326');
    assert.equal(result.proj4, '+proj=longlat');
  });

  // BUG: passing a bare numeric string with toString=false hits the
  // `(crs && !crs.epsg)` guard and returns null before reaching the CRS-building
  // branch — making that branch dead code for plain string inputs.
  it('BUG: returns null for a bare numeric string (dead-code path)', () => {
    const result = normalizeEpsg('4326', false);
    assert.equal(result, null);
    // Expected correct behaviour would be:
    // assert.deepEqual(result, { epsg: 'EPSG:4326', proj4: '', axisinverted: false, geographic: false });
  });

});
