import { describe, it } from 'node:test';
import assert           from 'node:assert/strict';
import { throttle }     from '../../../src/utils/throttle.js';

describe('throttle', () => {

  it('calls the function on the first invocation', (t) => {
    t.mock.timers.enable({ apis: ['Date'] });
    const fn = t.mock.fn();
    const throttled = throttle(fn, 500);

    throttled();
    assert.equal(fn.mock.callCount(), 1);
  });

  it('suppresses calls within the delay window', (t) => {
    t.mock.timers.enable({ apis: ['Date'] });
    const fn = t.mock.fn();
    const throttled = throttle(fn, 500);

    throttled();              // fires (first call)
    t.mock.timers.tick(100);
    throttled();              // suppressed — only 100ms elapsed
    t.mock.timers.tick(100);
    throttled();              // suppressed — only 200ms elapsed
    assert.equal(fn.mock.callCount(), 1);
  });

  // NOTE: implementation uses (elapsed > delay), not (>= delay), so exactly
  // `delay`ms is still suppressed. Also: suppressed calls update `lastCall`,
  // so the re-fire window resets on every call (fired or not).
  it('fires again after delay+1ms with no intermediate calls', (t) => {
    t.mock.timers.enable({ apis: ['Date'] });
    const fn = t.mock.fn();
    const throttled = throttle(fn, 500);

    throttled();              // fires at t=0, lastCall=0
    t.mock.timers.tick(501);  // t=501, no intermediate calls
    throttled();              // previousCall=0, elapsed=501, 501>500=true → fires
    assert.equal(fn.mock.callCount(), 2);
  });

  it('forwards arguments to the wrapped function', (t) => {
    t.mock.timers.enable({ apis: ['Date'] });
    const fn = t.mock.fn();
    const throttled = throttle(fn, 500);

    throttled('x', 42);
    assert.deepEqual(fn.mock.calls[0].arguments, ['x', 42]);
  });

  it('uses the default 500ms delay — suppresses within window', (t) => {
    t.mock.timers.enable({ apis: ['Date'] });
    const fn = t.mock.fn();
    const throttled = throttle(fn);

    throttled();              // fires at t=0
    t.mock.timers.tick(499);
    throttled();              // suppressed (499ms elapsed, not > 500)
    assert.equal(fn.mock.callCount(), 1);
  });

  it('uses the default 500ms delay — fires again after 501ms with no interim calls', (t) => {
    t.mock.timers.enable({ apis: ['Date'] });
    const fn = t.mock.fn();
    const throttled = throttle(fn);

    throttled();              // fires at t=0, lastCall=0
    t.mock.timers.tick(501);  // no calls in between → lastCall still 0
    throttled();              // elapsed = 501 > 500 → fires
    assert.equal(fn.mock.callCount(), 2);
  });

});
