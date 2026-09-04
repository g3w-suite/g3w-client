import { describe, it } from 'node:test';
import assert           from 'node:assert/strict';
import { debounce }     from '../../../src/utils/debounce.js';

describe('debounce', () => {

  it('calls the function after the delay', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] }); // clearTimeout is implicitly mocked
    const fn = t.mock.fn();
    const debounced = debounce(fn, 200);

    debounced();
    assert.equal(fn.mock.callCount(), 0);

    t.mock.timers.tick(200);
    assert.equal(fn.mock.callCount(), 1);
  });

  it('resets the timer on repeated calls (only the last fires)', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const fn = t.mock.fn();
    const debounced = debounce(fn, 300);

    debounced('a');
    t.mock.timers.tick(100);
    debounced('b');
    t.mock.timers.tick(100);
    debounced('c');

    assert.equal(fn.mock.callCount(), 0);

    t.mock.timers.tick(300);
    assert.equal(fn.mock.callCount(), 1);
    assert.deepEqual(fn.mock.calls[0].arguments, ['c']);
  });

  it('forwards arguments to the wrapped function', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const fn = t.mock.fn();
    const debounced = debounce(fn, 100);

    debounced(1, 2, 3);
    t.mock.timers.tick(100);

    assert.deepEqual(fn.mock.calls[0].arguments, [1, 2, 3]);
  });

  it('uses the default 500ms delay when none is provided', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const fn = t.mock.fn();
    const debounced = debounce(fn);

    debounced();
    t.mock.timers.tick(499);
    assert.equal(fn.mock.callCount(), 0);

    t.mock.timers.tick(1);
    assert.equal(fn.mock.callCount(), 1);
  });

  it('can fire multiple times after separate debounce periods', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const fn = t.mock.fn();
    const debounced = debounce(fn, 100);

    debounced();
    t.mock.timers.tick(100);
    assert.equal(fn.mock.callCount(), 1);

    debounced();
    t.mock.timers.tick(100);
    assert.equal(fn.mock.callCount(), 2);
  });

});
