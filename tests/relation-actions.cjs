const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('@vue/compiler-sfc');
const esbuild = require('esbuild');

async function main() {
  const root = path.resolve(__dirname, '..');
  const client = fs.readFileSync(path.join(root, 'src/g3w-app.js'), 'utf8');
  const source = fs.readFileSync(path.join(root, 'src/components/Relations.vue'), 'utf8');
  const pluginPath = process.argv[2] || path.join(root, 'src/plugins/g3w-admin-qplotly/static/qplotly/js/plugin.js');
  const plugin = fs.readFileSync(pluginPath, 'utf8');
  const descriptor = compiler.parse({ source, filename: 'Relations.vue' });
  assert.deepEqual(compiler.compileTemplate({ source: descriptor.template.content, filename: 'Relations.vue' }).errors, []);
  esbuild.transformSync(client, { loader: 'js' });
  esbuild.transformSync(descriptor.script.content, { loader: 'js' });
  assert.doesNotMatch(client + source + plugin, /show-chart|hide-chart|plotLayerIds|addLayersPlotIds/);
  assert.doesNotMatch(source, /toggleChart|onChartResize|has_charts/);
  assert.match(client, /addActionsForRelation\(actions, context\)/);

  const hooks = {};
  const failures = [];
  let service;
  const layer = {
    getId: () => 'child',
    getFilter: () => ({}),
    getSelection: () => ({}),
    isGeoLayer: () => false,
    isFather: () => false,
    on() {},
  };
  const GUI = {
    getService: () => ({}),
    onafter: (name, callback) => { hooks[name] = callback; },
    isReady: () => Promise.resolve(),
  };
  class Plugin {
    constructor() {
      service = this;
      this.config = { plots: [{ qgs_layer_id: 'child', show_position: ['query'] }] };
    }
    registerPlugin() { return true; }
    createSideBarComponent() { return { onbefore() {} }; }
    setReady() {}
  }
  const document = {
    createElement: () => ({
      children: [],
      style: {},
      events: {},
      setAttribute(name, value) { this[name] = value; },
      addEventListener(name, callback) { this.events[name] = callback; },
      append(...nodes) { this.children.push(...nodes); },
      remove() { this.removed = true; },
    }),
  };
  vm.runInNewContext(plugin, {
    initConfig: { group: { plugins: { qplotly: { baseUrl: '/' } } }, staticurl: '/' },
    g3wsdk: {
      constant: { G3W_FID: 'fid' },
      gui: { GUI },
      core: {
        utils: { debounce: callback => callback, throttle: callback => callback },
        plugin: { Plugin },
        catalog: { CatalogLayersStoresRegistry: { getLayerById: () => layer } },
        ApplicationState: {},
      },
    },
    g3w: { gettext: value => value },
    Vue: { observable: value => value },
    document,
    console: { warn: error => failures.push(error), log() {}, error: error => failures.push(error) },
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(failures, []);
  const register = hooks.addActionsForRelation;
  assert.equal(typeof register, 'function');
  const actions = [];
  const container = document.createElement('div');
  register(actions, { relation: { referencingLayer: 'other' }, container });
  assert.equal(actions.length, 0);
  const relation = { referencingLayer: 'child' };
  register(actions, { relation, fid: 0, container });
  assert.equal(actions.length, 1);
  const calls = [];
  service.toggleCharts = async options => { calls.push(options); };
  const action = actions[0];
  await action.cbk();
  assert.equal(action.state.toggled, true);
  assert.equal(calls[0].rel.fid, 0);
  assert.equal(calls[0].rel.relations[0], relation);
  const panel = container.children[0];
  const width = panel.children[0];
  width.value = '50';
  width.events.input();
  assert.equal(panel.style.flexBasis, '50%');
  await action.cbk();
  assert.equal(action.state.toggled, false);
  assert.equal(panel.removed, true);
  assert.equal(calls[0].container, calls[1].container);

  let finish;
  service.toggleCharts = options => options.show ? new Promise(resolve => { finish = resolve; }) : Promise.resolve();
  const opening = action.cbk();
  const closing = action.clear();
  finish();
  await Promise.all([opening, closing]);
  assert.equal(action.state.toggled, false);
  assert.equal(container.children.at(-1).removed, true);
  await action.cbk();
  assert.equal(action.state.toggled, false);
  console.log('Relation actions: compilation, plugin registration, toggle, resize, cleanup and legacy API removal OK');
}

main().catch(error => { console.error(error); process.exitCode = 1; });