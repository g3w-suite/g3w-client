import { describe, it } from 'node:test';
import assert           from 'node:assert/strict';
import { toRawType }    from '../../../src/utils/toRawType.js';

describe('toRawType', () => {
  it('returns "String" for strings', ()  => assert.equal(toRawType('hello'), 'String'));
  it('returns "Number" for numbers', ()  => assert.equal(toRawType(42), 'Number'));
  it('returns "Boolean" for booleans', () => assert.equal(toRawType(true), 'Boolean'));
  it('returns "Null" for null', ()        => assert.equal(toRawType(null), 'Null'));
  it('returns "Undefined" for undefined', () => assert.equal(toRawType(undefined), 'Undefined'));
  it('returns "Array" for arrays', ()    => assert.equal(toRawType([]), 'Array'));
  it('returns "Object" for plain objects', () => assert.equal(toRawType({}), 'Object'));
  it('returns "Function" for functions', () => assert.equal(toRawType(() => {}), 'Function'));
  it('returns "RegExp" for regexes', ()  => assert.equal(toRawType(/x/), 'RegExp'));
  it('returns "Date" for dates', ()      => assert.equal(toRawType(new Date()), 'Date'));
  it('returns "Map" for Map', ()         => assert.equal(toRawType(new Map()), 'Map'));
  it('returns "Set" for Set', ()         => assert.equal(toRawType(new Set()), 'Set'));
});
