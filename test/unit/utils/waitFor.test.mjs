import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { waitFor } from '../../../src/utils/waitFor.js';

describe('waitFor', () => {

  it('resolves immediately when predicate is already true', async () => {
    await assert.doesNotReject(waitFor(() => true));
  });

  it('resolves once the predicate becomes true', async (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] }); // clearInterval is implicitly mocked
    let ready = false;
    const promise = waitFor(() => ready);

    // predicate is false on the first synchronous check inside waitFor
    t.mock.timers.tick(100);  // interval fires, predicate still false
    ready = true;
    t.mock.timers.tick(100);  // interval fires again, predicate true → resolves

    await promise;
  });

  it('rejects with "timeout" when the timeout expires before predicate is true', async (t) => {
    t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] }); // clear* are implicitly mocked
    const promise = waitFor(() => false, 300);

    t.mock.timers.tick(300);

    await assert.rejects(promise, /timeout/);
  });

  it('resolves with the string "predicate"', async () => {
    const result = await waitFor(() => true);
    assert.equal(result, 'predicate');
  });

});
