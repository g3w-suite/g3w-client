import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { groupBy } from '../../../src/utils/groupBy.js';

describe('groupBy', () => {

  it('groups items by a string key', () => {
    const input = [
      { type: 'fruit', name: 'apple' },
      { type: 'veggie', name: 'carrot' },
      { type: 'fruit', name: 'banana' },
    ];
    const result = groupBy(input, item => item.type);
    assert.deepEqual(result, {
      fruit:  [{ type: 'fruit', name: 'apple' }, { type: 'fruit', name: 'banana' }],
      veggie: [{ type: 'veggie', name: 'carrot' }],
    });
  });

  it('groups items by a numeric key', () => {
    const input = [1, 2, 3, 4, 5];
    const result = groupBy(input, n => n % 2 === 0 ? 'even' : 'odd');
    assert.deepEqual(result, { odd: [1, 3, 5], even: [2, 4] });
  });

  it('returns an empty object for an empty array', () => {
    assert.deepEqual(groupBy([], x => x), {});
  });

  it('puts all items in one group when keyFn returns the same key', () => {
    const result = groupBy([1, 2, 3], () => 'all');
    assert.deepEqual(result, { all: [1, 2, 3] });
  });

  it('each item is in exactly one group', () => {
    const input = ['a', 'b', 'c'];
    const result = groupBy(input, x => x);
    assert.deepEqual(result, { a: ['a'], b: ['b'], c: ['c'] });
  });

});
