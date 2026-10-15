import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { parse, compileTemplate } from '@vue/compiler-sfc';
import { transformSync } from 'esbuild';

const source = readFileSync(new URL('../../../src/components/App.vue', import.meta.url), 'utf8');
const descriptor = parse({ source, filename: 'App.vue' });
const code = transformSync(descriptor.script.content, { format: 'cjs' }).code;

function setup() {
  const state = {
    sidebar: { open: false, components: [], contentsdata: [] },
    project: { state: { layerstree: [{ nodes: [{}] }] } },
  };
  const gui = {
    showSidebar: () => { state.sidebar.open = true; },
    hideSidebar: () => { state.sidebar.open = false; },
  };
  const module = { exports: {} };
  runInNewContext(code, {
    module,
    exports: module.exports,
    require: name => ({ __esModule: true, default: { 'g3w-state': state, 'g3w-app': gui }[name] || {} }),
  });
  const app = module.exports.default;
  const context = {
    selected_sidebar: 'catalog',
    panels: [],
    closeAllPanels: async () => { context.panels = []; },
    showLegendPanel: () => { context.panels.push('legend'); },
  };
  context.closeSidebar = () => app.methods.closeSidebar.call(context);
  Object.defineProperty(context, 'activeSidebarId', { get: () => app.computed.activeSidebarId.call(context) });
  Object.defineProperty(context, 'sidebarControls', { get: () => app.computed.sidebarControls.call(context) });
  return { app, gui, state, context, select: id => app.methods.selectSidebarItem.call(context, id) };
}

function setupPanels() {
  const source = readFileSync(new URL('../../../src/g3w-app.js', import.meta.url), 'utf8');
  const start = source.indexOf('  async showPanel(content) {');
  const end = source.indexOf('\n  /**', start);
  const state = { sidebar: { open: false, components: [], contentsdata: [] } };
  const gui = runInNewContext(`(new class {${source.slice(start, end)}})`, { ApplicationState: state });
  gui.showSidebar = () => { state.sidebar.open = true; };
  gui.hideSidebar = () => { state.sidebar.open = false; };
  const panel = id => ({
    title: id,
    getId: () => id,
    internalPanel: { $el: { style: {} } },
    mount: async () => {},
    unmount: async () => {},
  });
  return { gui, state, panel };
}

test('sidebar shell compiles with named icon controls', () => {
  const result = compileTemplate({ source: descriptor.template.content, filename: 'App.vue', id: 'app' });
  assert.deepEqual(result.errors, []);
  assert.match(descriptor.template.content, /:aria-label="\$t\(item.title\)"/);
  assert.match(descriptor.template.content, /'g3w-ol-toggled': item.open/);
  const sidebar = descriptor.template.content.split('<!-- SIDEBAR MENU -->')[1].split('<ul')[0];
  assert.equal(sidebar.match(/@click="closeSidebar"/g).length, 2);
  assert.equal(sidebar.match(/class="fas fa-times"/g).length, 2);
});

test('sidebar headers show the active control title with panel titles taking precedence', () => {
  const env = setup();
  const title = () => env.app.computed.sidebarTitle.call(env.context);
  assert.equal(title(), 'Layers');
  env.context.selected_sidebar = 'themes';
  assert.equal(title(), 'THEME');
  env.context.selected_sidebar = 'legend';
  assert.equal(title(), 'legend');
  const bookmarks = {
    id: 'spatialbookmarks', title: 'Bookmarks', visible: true, collapsible: true, open: true,
    getOpen() { return this.open; },
  };
  const search = {
    id: 'search', title: 'Search', visible: true, collapsible: true, open: false,
    getOpen() { return this.open; },
  };
  env.state.sidebar.components.push(bookmarks, search);
  env.state.sidebar.title = 'Layers';
  assert.equal(title(), 'Bookmarks');
  bookmarks.open = false;
  search.open = true;
  assert.equal(title(), 'Search');
  env.context.panels.push('editing-panel');
  env.state.sidebar.title = 'Editing Layers';
  assert.equal(title(), 'Editing Layers');
  env.state.sidebar.title = '';
  assert.equal(title(), 'Search');
  assert.equal(descriptor.template.content.match(/\{\{ \$t\(sidebarTitle\) \}\}/g).length, 2);
  assert.doesNotMatch(descriptor.template.content, /v-t\s*=\s*"sidebarTitle"/);
});

test('the close button clears the toggle for built-in sections and all sidebar plugin types', async () => {
  for (const id of ['catalog', 'themes', 'legend']) {
    const env = setup();
    await env.select(id);
    assert.equal(env.state.sidebar.open, true);
    await env.context.closeSidebar();
    assert.equal(env.state.sidebar.open, false);
    assert.deepEqual(env.context.panels, []);
    await env.select(id);
    assert.equal(env.state.sidebar.open, true);
  }
  for (const collapsible of [true, false]) {
    const env = setup();
    const component = {
      id: 'plugin', collapsible, open: true, visible: true,
      getOpen() { return this.open; },
      click({ open }) { this.open = open; },
    };
    env.state.sidebar.components.push(component);
    env.state.sidebar.open = true;
    env.context.panels.push('plugin-panel');
    await env.context.closeSidebar();
    assert.equal(component.open, false);
    assert.equal(env.state.sidebar.open, false);
    assert.deepEqual(env.context.panels, []);
    assert.equal(env.app.computed.sidebarControls.call(env.context).find(item => item.id === 'plugin').open, false);
    await env.select('plugin');
    assert.equal(component.open, true);
  }
});

test('the close button respects sidebar and panel closing locks', async () => {
  const env = setup();
  env.state.sidebar.open = true;
  env.context.panels.push('editing-panel');
  env.state.sidebar.btn_close = false;
  await env.context.closeSidebar();
  assert.equal(env.state.sidebar.open, true);
  assert.deepEqual(env.context.panels, ['editing-panel']);
  env.state.sidebar.btn_close = true;
  env.state.sidebar.disabled = true;
  await env.context.closeSidebar();
  assert.equal(env.state.sidebar.open, true);
  assert.deepEqual(env.context.panels, ['editing-panel']);
});

test('theme controls have an accessible icon-only add button and native actions', () => {
  const themes = descriptor.template.content.split('id     = "g3w-themes"')[1].split('<!-- ADD NEW MAP THEME (FORM) -->')[0];
  const add = themes.match(/<button\b[^>]*class\s*=\s*"map-theme-add"[^>]*>[\s\S]*?<\/button>/)[0];
  assert.match(add, /:aria-label\s*=\s*"\$t\('add'\)"/);
  assert.match(add, /:data-i18n-title\s*=\s*"'add'"/);
  assert.match(add, /<i aria-hidden="true" class\s*=\s*"fas fa-plus"><\/i>/);
  assert.doesNotMatch(add, /<span>/);
  assert.match(themes, /<button[\s\S]*?:aria-label\s*=\s*"\$t\('update'\)/);
  assert.match(themes, /:disabled\s*=\s*"active_theme.theme !== map_theme.theme"/);
  assert.doesNotMatch(themes, /class\s*=\s*"action sidebar-button"/);
});

test('selects only the current plugin or catalog and toggles the panel', async () => {
  const env = setup();
  const component = {
    id: 'editing', collapsible: true, open: false,
    getOpen() { return this.open; },
    click({ open }) { this.open = open; },
  };
  env.state.sidebar.components.push(component);
  await env.select('catalog');
  assert.equal(env.state.sidebar.open, true);
  await env.select('editing');
  assert.equal(env.context.activeSidebarId, 'editing');
  assert.equal(component.open, true);
  await env.select('catalog');
  assert.equal(component.open, false);
  assert.equal(env.context.activeSidebarId, 'catalog');
  await env.select('catalog');
  assert.equal(env.state.sidebar.open, false);
});

test('clicking the legend again closes it without duplicating panels', async () => {
  const env = setup();
  await env.select('legend');
  assert.deepEqual(env.context.panels, ['legend']);
  await env.select('legend');
  assert.deepEqual(env.context.panels, []);
  assert.equal(env.state.sidebar.open, false);
});

test('modal-only components activate without leaving an empty sidebar open', async () => {
  const env = setup();
  const component = {
    id: 'print', collapsible: false, open: false, visible: true,
    getOpen() { return this.open; },
    click({ open }) { this.open = open; },
  };
  env.state.sidebar.components.push(component);
  await env.select('catalog');
  assert.equal(env.state.sidebar.open, true);
  await env.select('print');
  assert.equal(component.open, true);
  assert.equal(env.state.sidebar.open, false);
  assert.equal(env.context.activeSidebarId, 'print');
  assert.equal(env.app.computed.sidebarControls.call(env.context).find(item => item.id === 'print').open, true);
  await env.select('print');
  assert.equal(component.open, false);
  assert.equal(env.state.sidebar.open, false);
  assert.equal(env.app.computed.sidebarControls.call(env.context).find(item => item.id === 'print').open, false);
});

test('a non-collapsible plugin can open a panel and close it through its control', async () => {
  const env = setup();
  const component = {
    id: 'qplotly', collapsible: false, open: false,
    getOpen() { return this.open; },
    click({ open }) {
      this.open = open;
      if (open) {
        env.gui.showSidebar();
        env.context.panels.push('plot-panel');
      }
    },
  };
  env.state.sidebar.components.push(component);
  await env.select('qplotly');
  assert.equal(env.state.sidebar.open, true);
  assert.equal(env.context.activeSidebarId, 'qplotly');
  assert.deepEqual(env.context.panels, ['plot-panel']);
  env.state.sidebar.btn_close = false;
  await env.select('qplotly');
  assert.equal(component.open, true);
  assert.deepEqual(env.context.panels, ['plot-panel']);
  env.state.sidebar.btn_close = true;
  await env.select('qplotly');
  assert.equal(component.open, false);
  assert.equal(env.state.sidebar.open, false);
  assert.deepEqual(env.context.panels, []);
});

test('Add Layer opens its modal without replacing the current sidebar content', async () => {
  const env = setup();
  let opened = false;
  env.context.showaddLayerModal = () => { opened = true; };
  await env.select('add-layer');
  assert.equal(opened, true);
  assert.equal(env.state.sidebar.open, false);
  assert.equal(env.context.activeSidebarId, 'catalog');
  assert.ok(env.app.computed.sidebarControls.call(env.context).some(item => item.id === 'add-layer'));
});

test('Change Map opens its selector only when other maps are available outside an iframe', async () => {
  const env = setup();
  let opened = false;
  env.context.openChangeMapMenu = () => { opened = true; };
  env.context.has_related_maps = true;
  assert.ok(env.app.computed.sidebarControls.call(env.context).some(item => item.id === 'change-map'));
  await env.select('change-map');
  assert.equal(opened, true);
  assert.equal(env.state.sidebar.open, false);
  assert.equal(env.context.activeSidebarId, 'catalog');
  env.state.iframe = true;
  assert.equal(env.app.computed.sidebarControls.call(env.context).some(item => item.id === 'change-map'), false);
  env.state.iframe = false;
  env.context.has_related_maps = false;
  assert.equal(env.app.computed.sidebarControls.call(env.context).some(item => item.id === 'change-map'), false);
});

test('an editing panel opens its own container and releases the command when closed', async () => {
  const env = setupPanels();
  const editing = {
    collapsible: false, open: true,
    getOpen() { return this.open; },
    setOpen(open) { this.open = open; },
  };
  env.state.sidebar.components.push(editing);
  await env.gui.showPanel(env.panel('editing-panel'));
  assert.equal(env.state.sidebar.open, true);
  assert.equal(env.state.sidebar.contentsdata.length, 1);
  await env.gui.closePanel();
  assert.equal(env.state.sidebar.open, false);
  assert.equal(editing.open, false);
  assert.equal(env.state.sidebar.contentsdata.length, 0);
  await env.gui.showPanel(env.panel('editing-panel'));
  assert.equal(env.state.sidebar.open, true);
});

test('closing a nested panel restores its parent without hiding the container', async () => {
  const env = setupPanels();
  const parent = env.panel('editing-panel');
  await env.gui.showPanel(parent);
  await env.gui.showPanel(env.panel('child'));
  assert.equal(parent.internalPanel.$el.style.display, 'none');
  await env.gui.closePanel();
  assert.equal(env.state.sidebar.open, true);
  assert.equal(env.state.sidebar.title, 'editing-panel');
  assert.equal(parent.internalPanel.$el.style.display, 'block');
});

test('editing panels block other tools and explicit sidebar locks block all commands', async () => {
  const env = setup();
  env.context.selected_sidebar = 'editing';
  env.context.panels.push({ content: 'editing-panel' });
  env.state.sidebar.open = true;
  let activated = false;
  env.state.sidebar.components.push({
    id: 'editing', collapsible: false,
    getOpen: () => true,
    click: () => { activated = true; },
  });
  env.context.showaddLayerModal = () => { activated = true; };
  env.context.openChangeMapMenu = () => { activated = true; };
  for (const id of ['catalog', 'add-layer', 'change-map', 'metadata']) {
    await env.select(id);
  }
  assert.equal(activated, false);
  assert.equal(env.state.sidebar.open, true);
  assert.equal(env.context.activeSidebarId, 'editing');
  env.state.sidebar.disabled = true;
  await env.select('editing');
  assert.equal(activated, false);
  assert.match(descriptor.template.content, /:disabled="item.disabled \|\| disabled \|\| \(panels.length > 0 && activeSidebarId !== item.id\)"/);
});

test('closing all panels uses the shared lifecycle in reverse order', async () => {
  const env = setup();
  env.state.sidebar.contentsdata.push('parent', 'child');
  const closed = [];
  env.gui.closePanel = async () => { closed.push(env.state.sidebar.contentsdata.pop()); };
  await env.app.methods.closeAllPanels.call(env.context);
  assert.deepEqual(closed, ['child', 'parent']);
});

test('Panel show and close return their GUI lifecycle promises', () => {
  const source = readFileSync(new URL('../../../src/g3w-panel.js', import.meta.url), 'utf8');
  const shown = Promise.resolve();
  const closed = Promise.resolve();
  const module = { exports: {} };
  const gui = { showPanel: () => shown, closePanel: () => closed };
  runInNewContext(transformSync(source, { format: 'cjs' }).code, {
    module,
    exports: module.exports,
    require: name => ({ __esModule: true, default: 'g3w-app' === name ? gui : class {} }),
  });
  const panel = new module.exports.default();
  assert.equal(panel.show(), shown);
  assert.equal(panel.close(), closed);
});