import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';

const source = readFileSync(new URL('../../../src/g3w-plugin.js', import.meta.url), 'utf8');
const code = transformSync(source, { format: 'cjs' }).code;
const flush = () => new Promise(resolve => setImmediate(resolve));

function setup() {
  let ready;
  const guiReady = new Promise(resolve => { ready = resolve; });
  const timers = new Map();
  const errors = [];
  const state = { plugins: ['demo'], layout: { app: { rightpanel: { width: 50, height: 50 } } } };
  const gui = {
    isReady: () => guiReady,
    registerPlugin: plugin => { gui.plugin = plugin; },
  };
  class Emitter {
    emit() {}
  }
  const modules = {
    'g3w-emitter': { default: Emitter },
    'g3w-component': { default: class {} },
    'g3w-state': { default: state },
    'g3w-app': { default: gui },
    'ol/Observable': { default: class {}, unByKey() {} },
    'utils/toRawType': { toRawType: value => null === value ? 'Null' : 'Object' },
    'g3w-i18n': { gettext: { register() {} } },
  };
  const module = { exports: {} };
  runInNewContext(code, {
    module,
    exports: module.exports,
    require: name => ({ __esModule: true, ...modules[name] }),
    window: { initConfig: { plugins: { demo: { gid: 'qdjango:1' } } } },
    console: { error: (...args) => errors.push(args) },
    structuredClone,
    setTimeout: (callback, delay) => {
      const key = {};
      timers.set(key, { callback, delay });
      return key;
    },
    clearTimeout: key => timers.delete(key),
  });
  state.project = { getGid: () => 'qdjango:1' };
  return {
    Plugin: module.exports.Plugin, state, gui, ready, errors, timers,
    cleanup: () => {
      for (const [key, timer] of timers) {
        if (0 === timer.delay) {
          timers.delete(key);
          timer.callback();
        }
      }
    },
  };
}

test('registerPlugin registers compatible plugins', () => {
  const env = setup();
  const plugin = { name: 'demo' };
  assert.equal(env.Plugin.prototype.registerPlugin.call(plugin, 'qdjango:1'), true);
  assert.equal(env.gui.plugin, plugin);
  assert.equal(typeof env.Plugin.prototype.isCurrentProjectCompatible, 'undefined');
});

test('registerPlugin clears loading and timeout for incompatible plugins', () => {
  const env = setup();
  const timeout = {};
  const plugin = { name: 'demo', _timeout: timeout };
  env.state.plugins.push('other');
  env.timers.set(timeout, {});
  assert.equal(env.Plugin.prototype.registerPlugin.call(plugin, 'qdjango:2'), false);
  assert.equal(env.gui.plugin, undefined);
  assert.deepEqual(Array.from(env.state.plugins), ['other']);
  assert.equal(env.timers.size, 0);
});

test('registerPlugin runs once before optional initialization after GUI readiness', async () => {
  const env = setup();
  let registrations = 0;
  let initialized = false;
  const plugin = new class extends env.Plugin {
    constructor() { super({ name: 'demo' }); }
    registerPlugin(gid) {
      registrations++;
      return super.registerPlugin(gid);
    }
    init() {
      assert.equal(env.gui.plugin, this);
      initialized = true;
    }
  };
  assert.equal(registrations, 0);
  env.ready();
  await flush();
  assert.equal(registrations, 1);
  assert.equal(initialized, true);
  assert.equal(plugin._ready, true);
  env.cleanup();
  assert.equal(env.timers.size, 0);
});

test('waits for GUI and asynchronous init before marking the plugin ready', async () => {
  const env = setup();
  let finish;
  let initialized = false;
  const initialization = new Promise(resolve => { finish = resolve; });
  const plugin = new class extends env.Plugin {
    field = 'initialized';
    constructor() { super({ name: 'demo' }); }
    async init() {
      assert.equal(this.field, 'initialized');
      assert.equal(env.gui.plugin, undefined);
      initialized = true;
      await initialization;
    }
  };
  const readiness = plugin.isReady();
  const awaited = Promise.resolve(plugin);
  const concurrent = Promise.resolve(plugin);
  assert.equal(typeof plugin.then, 'function');
  assert.equal(initialized, false);
  assert.equal(env.gui.plugin, undefined);
  env.ready();
  await flush();
  assert.equal(initialized, true);
  assert.equal(plugin._ready, false);
  assert.equal(env.state.plugins.length, 1);
  finish();
  assert.equal(await readiness, true);
  assert.equal(await awaited, plugin);
  assert.equal(await concurrent, plugin);
  assert.equal(await plugin, plugin);
  assert.equal(typeof plugin.then, 'undefined');
  assert.equal(env.gui.plugin, plugin);
  assert.equal(plugin._ready, true);
  assert.ok(env.state.layout.demo);
  env.cleanup();
  assert.equal(env.state.plugins.length, 0);
  assert.equal(env.timers.size, 0);
});

test('does not initialize or register plugins for an incompatible project', async () => {
  const env = setup();
  let initialized = false;
  const plugin = new class extends env.Plugin {
    constructor() { super({ name: 'demo', config: { gid: 'qdjango:2' } }); }
    init() { initialized = true; }
  };
  const rejection = assert.rejects(Promise.resolve(plugin), /not available on this project/);
  env.ready();
  await rejection;
  env.cleanup();
  assert.equal(initialized, false);
  await assert.rejects(plugin.isReady(), /not available on this project/);
  assert.equal(env.gui.plugin, undefined);
  assert.equal(plugin._ready, false);
  assert.equal(env.state.plugins.length, 0);
  assert.equal(env.timers.size, 0);
});

for (const asynchronous of [false, true]) {
  test(`clears loading after ${asynchronous ? 'asynchronous' : 'synchronous'} initialization failure`, async () => {
    const env = setup();
    const failure = new Error('init failed');
    const plugin = new class extends env.Plugin {
      constructor() { super({ name: 'demo' }); }
      init() {
        if (asynchronous) { return Promise.reject(failure); }
        throw failure;
      }
    };
    const rejection = assert.rejects(plugin.isReady(), error => error === failure);
    const awaitedRejection = assert.rejects(Promise.resolve(plugin), error => error === failure);
    env.ready();
    await rejection;
    await awaitedRejection;
    env.cleanup();
    assert.equal(plugin._ready, false);
    assert.equal(env.state.plugins.length, 0);
    assert.equal(env.timers.size, 0);
    assert.equal(env.errors[0][1], failure);
    await assert.rejects(plugin.isReady(), error => error === failure);
  });
}

test('direct instances resolve to themselves and register after GUI readiness', async () => {
  const env = setup();
  const plugin = new env.Plugin({ name: 'demo' });
  const awaited = Promise.resolve(plugin);
  assert.equal(env.gui.plugin, undefined);
  env.ready();
  assert.equal(await awaited, plugin);
  assert.equal(plugin.getApp(), env.gui);
  assert.equal(env.gui.plugin, plugin);
  assert.equal(plugin._ready, true);
  env.cleanup();
  assert.equal(env.timers.size, 0);
});

test('subclasses without init also wait for GUI and register automatically', async () => {
  const env = setup();
  const plugin = new class extends env.Plugin {
    field = 'initialized';
    constructor() { super({ name: 'demo' }); }
  };
  const awaited = Promise.resolve(plugin);
  await flush();
  assert.equal(env.gui.plugin, undefined);
  assert.equal(plugin._ready, false);
  assert.equal(env.state.plugins.length, 1);
  assert.equal(env.timers.size, 1);
  env.ready();
  assert.equal(await awaited, plugin);
  assert.equal(plugin.field, 'initialized');
  assert.equal(typeof plugin.then, 'undefined');
  assert.equal(env.gui.plugin, plugin);
  assert.equal(plugin._ready, true);
  assert.equal(await plugin.isReady(), true);
  env.cleanup();
  assert.equal(env.state.plugins.length, 0);
  assert.equal(env.timers.size, 0);
});