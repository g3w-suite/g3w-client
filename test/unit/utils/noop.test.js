import { describe, it } from 'node:test';
import assert           from 'node:assert/strict';
import { noop }         from '../../../src/utils/noop.js';

describe('noop', () => {
  it('returns undefined', () => assert.equal(noop(), undefined));
  it('accepts any arguments without throwing', () => assert.doesNotThrow(() => noop(1, 'two', null, {})));
});
