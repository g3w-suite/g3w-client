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
    content: { contentsdata: [] },
    project: { state: { layerstree: [{ nodes: [{}] }] } },
  };
  const gui = {
    showToolDialog: dialog => dialog.showModal(),
    showSidebar: () => { state.sidebar.open = true; },
    hideSidebar: () => { state.sidebar.open = false; },
    closePanel: async () => {
      context.panels.pop();
      state.sidebar.open = context.panels.length > 0;
    },
    closeContent() {},
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
  context.closePanel = () => app.methods.closePanel.call(context);
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

function setupRegistration(state) {
  const source = readFileSync(new URL('../../../src/g3w-app.js', import.meta.url), 'utf8');
  const start = source.indexOf('  addComponent(component, options = {}) {');
  const end = source.indexOf('\n  /**', start);
  const mounted = [];
  const classes = () => {
    const values = new Set();
    return {
      toggle(name, enabled) { enabled ? values.add(name) : values.delete(name); },
      contains(name) { return values.has(name); },
    };
  };
  const Vue = {
    extend: () => class {
      $el = { classList: classes() };
      $refs = { 'component-placeholder': {} };
      $on(event, callback) { this.mounted = callback; return this; }
      $mount() { mounted.push(this.mounted()); return this; }
    },
  };
  const sidebar = { children: [], querySelector: selector => {
    assert.equal(selector, '#catalog');
    return { insertAdjacentElement() {} };
  } };
  const gui = runInNewContext(`(new class {${source.slice(start, end)}})`, {
    ApplicationState: state, Vue, isMobile: { any: false },
    document: { getElementById: () => sidebar },
  });
  gui.showSidebar = () => { state.sidebar.open = true; };
  const component = (id, open, collapsible = true) => {
    const node = { classList: classes(), parentNode: { classList: classes() } };
    return {
      id, title: id, visible: true, open, collapsible,
      getOpen() { return this.open; },
      setOpen(open) { this.open = open; },
      getInternalComponent: () => ({ $el: node }),
      mount: async () => {},
    };
  };
  return { gui, component, mounted: () => Promise.all(mounted) };
}

test('an initially active sidebar control opens its content and supports closing without a first click', async () => {
  const env = setup();
  const registration = setupRegistration(env.state);
  const component = registration.component('Bookmarks', true);
  registration.gui.addComponent(component);
  await registration.mounted();
  assert.equal(env.state.sidebar.open, true);
  assert.equal(env.context.activeSidebarId, 'Bookmarks');
  assert.equal(env.app.computed.sidebarTitle.call(env.context), 'Bookmarks');
  assert.equal(component.getInternalComponent().$el.classList.contains('menu-open'), true);
  await env.select('Bookmarks');
  assert.equal(component.getOpen(), false);
  assert.equal(env.state.sidebar.open, false);
  assert.equal(component.getInternalComponent().$el.classList.contains('menu-open'), false);
});

test('registration leaves inactive and non-collapsible controls closed without replaying activation', async () => {
  for (const [open, collapsible] of [[false, true], [true, false]]) {
    const env = setup();
    const registration = setupRegistration(env.state);
    const component = registration.component('plugin', open, collapsible);
    let activations = 0;
    component.setOpen = () => { activations++; };
    registration.gui.addComponent(component);
    await registration.mounted();
    assert.equal(env.state.sidebar.open, false);
    assert.equal(activations, 0);
    assert.equal(component.getOpen(), open);
    assert.equal(env.context.sidebarControls.find(item => item.id === 'plugin').open, open);
  }
});

test('sidebar shell compiles with named icon controls', () => {
  const result = compileTemplate({ source: descriptor.template.content, filename: 'App.vue', id: 'app' });
  assert.deepEqual(result.errors, []);
  assert.match(descriptor.template.content, /:aria-label="\$t\(item.title\)"/);
  assert.match(descriptor.template.content, /'g3w-ol-toggled': item.open/);
  const sidebar = descriptor.template.content.split('<!-- SIDEBAR MENU -->')[1].split('<ul')[0];
  assert.equal(sidebar.match(/@click="closeSidebar"/g).length, 2);
  assert.equal(sidebar.match(/class="fas fa-times"/g).length, 2);
});

test('plugin loading uses a Font Awesome plug pulsing until hidden when motion is allowed', () => {
  const indicator = descriptor.template.content.match(/<div :class="\{ 'sidebar-plugin-loading':[\s\S]*?<\/div>/)[0];
  assert.match(indicator, /role="status"/);
  assert.doesNotMatch(indicator, /@click|tabindex|tabIndex|<button/);
  assert.match(descriptor.template.content, /class="fas fa-plug plugin-loading-icon" aria-hidden="true"/);
  assert.doesNotMatch(indicator, /is-loading/);
  assert.doesNotMatch(descriptor.template.content, /fa-circle-notch|fa-spin/);
  const css = readFileSync(new URL('../../../src/static/app.css', import.meta.url), 'utf8');
  assert.doesNotThrow(() => transformSync(css, { loader: 'css' }));
  assert.match(css, /\.sidebar-plugin-loading \{[^}]*width: 39px;[^}]*height: 39px;/);
  assert.match(css, /\.sidebar-plugin-loading \{[^}]*cursor: default;/);
  assert.match(css, /\.sidebar-plugin-loading \.plugin-loading-icon \{ font-size: 2\.5rem; \}/);
  assert.match(css, /@keyframes plugin-loading-pulse \{\s*0%, 100% \{ transform: scale\(\.65\); \}\s*50% \{ transform: scale\(1\); \}/);
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)\s*\{\s*\.sidebar-plugin-loading:not\(\.g3w-hide\) \.plugin-loading-icon \{ animation: plugin-loading-pulse 2s ease-in-out infinite;/);
});

test('sidebar headers show the active control title with panel titles taking precedence', () => {
  const env = setup();
  const title = () => env.app.computed.sidebarTitle.call(env.context);
  assert.equal(title(), 'Layers');
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

test('the close button closes built-in sections and plugin controls without stacked panels', async () => {
  for (const id of ['catalog', 'legend']) {
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
    await env.context.closeSidebar();
    assert.equal(component.open, false);
    assert.equal(env.state.sidebar.open, false);
    assert.deepEqual(env.context.panels, []);
    assert.equal(env.app.computed.sidebarControls.call(env.context).find(item => item.id === 'plugin').open, false);
    await env.select('plugin');
    assert.equal(component.open, true);
  }
});

test('closing the search panel returns to its list without hiding the sidebar', async () => {
  const env = setup();
  const search = {
    id: 'search', collapsible: true, open: true, visible: true,
    getOpen() { return this.open; },
    click({ open }) { this.open = open; },
  };
  env.state.sidebar.components.push(search);
  env.state.sidebar.open = true;
  env.context.selected_sidebar = 'search';
  env.context.panels.push('search-form');

  await env.context.closeSidebar();

  assert.deepEqual(env.context.panels, []);
  assert.equal(search.open, true);
  assert.equal(env.state.sidebar.open, true);
  assert.equal(env.context.activeSidebarId, 'search');
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

test('themes opens a modal without opening the sidebar or deactivating its current control', async () => {
  for (const open of [false, true]) {
    const env = setup();
    let opened = 0;
    env.context.$refs = { mapThemesDialog: { showModal() { opened++; } } };
    env.state.sidebar.open = open;
    const component = { id: 'plugin', getOpen: () => true };
    env.state.sidebar.components.push(component);
    await env.select('themes');
    assert.equal(opened, 1);
    assert.equal(env.state.sidebar.open, open);
    assert.equal(env.context.selected_sidebar, 'catalog');
    assert.equal(env.context.activeSidebarId, 'plugin');
  }
  const modal = descriptor.template.content.split('<context-menu />')[1].split('<!-- ADD NEW MAP THEME (FORM) -->')[0];
  assert.match(modal, /<dialog[\s\S]*?ref\s*=\s*"mapThemesDialog"/);
  assert.match(modal, /aria-labelledby\s*=\s*"map-themes-title"/);
  assert.match(modal, /@click\s*=\s*"\$refs.mapThemesDialog.close\(\)"/);
  assert.match(modal, /<header class\s*=\s*"map-themes-header">\s*<i class\s*=\s*"far fa-eye" aria-hidden\s*=\s*"true"><\/i>/);
  const css = readFileSync(new URL('../../../src/static/app.css', import.meta.url), 'utf8');
  assert.match(css, /\[class\^="usermessage-"\] > form > header,\s*\.map-themes-header\s*\{[^}]*border-bottom: 2px solid #eee;/);
  assert.match(css, /\.map-themes-header h2\s*\{[^}]*font-weight: bold; text-align: center;/);
});

test('legacy sidebar headers use the toolbar route and ignore clicks inside control content', () => {
  const env = setup();
  const selected = [];
  env.state.sidebar.components.push({ id: 'spatialbookmarks' });
  env.context.selectSidebarItem = id => selected.push(id);
  const click = link => env.app.methods.toggleSidebarItem.call(env.context, {
    target: { closest(selector) {
      assert.equal(selector, '.sidebar-item > a');
      return link;
    } },
  });
  click({ parentElement: { id: 'spatialbookmarks' } });
  click({ parentElement: { id: 'catalog' } });
  click(null);
  assert.deepEqual(selected, ['spatialbookmarks']);
});

test('bookmarks opens its existing component in a modal instead of the catalog', async () => {
  const env = setup();
  let opened = 0;
  let mounted;
  const node = {};
  const component = {
    id: 'spatialbookmarks', open: false, collapsible: false,
    getOpen() { return this.open; },
    setOpen(open) { this.open = open; },
    getInternalComponent: () => ({ $el: node }),
  };
  env.state.sidebar.components.push(component);
  env.context.$refs = {
    bookmarksDialog: { showModal() { opened++; } },
    bookmarksContent: { appendChild(value) { mounted = value; } },
  };
  await env.select('spatialbookmarks');
  assert.equal(opened, 1);
  assert.equal(mounted, node);
  assert.equal(env.state.sidebar.open, false);
  assert.equal(component.open, true);
  env.app.methods.onBookmarksDialogClose.call(env.context);
  assert.equal(component.open, false);
});

test('Print opens in the centered tool dialog and closes through the native lifecycle', async () => {
  const source = readFileSync(new URL('../../../src/g3w-app.js', import.meta.url), 'utf8');
  const start = source.indexOf('  async showUserMessage({');
  const end = source.indexOf('\n  /** Replace the current tool window', start);
  const events = {};
  const button = { addEventListener: (name, callback) => { button[name] = callback; } };
  const header = {};
  let markup;
  let opened = false;
  let removed = false;
  const dialog = {
    children: [],
    addEventListener: (name, callback) => { events[name] = callback; },
    querySelector: selector => selector === 'header' ? header : button,
    close() { events.close(); },
    remove() { removed = true; },
  };
  const gui = runInNewContext(`(new class {${source.slice(start, end).replaceAll('this.#makeDraggable', 'this.makeDraggable')}})`, {
    Vue: { prototype: { $fa: icon => icon } },
    _: text => text,
    document: {
      createElement: () => ({
        set innerHTML(value) { markup = value; },
        content: { firstChild: dialog },
      }),
      body: { append() {} },
    },
  });
  gui.closeToolDialogs = () => {};
  gui.showToolDialog = value => { assert.equal(value, dialog); opened = true; };
  gui.makeDraggable = (value, handle) => {
    assert.equal(value, dialog);
    assert.equal(handle, header);
  };
  await gui.showUserMessage({ title: 'Print', modal: true, mapInteractive: true });
  assert.equal(opened, true);
  assert.match(markup, /class="map-themes-dialog" data-tool-dialog data-tool-message/);
  assert.match(markup, /data-map-interactive/);
  assert.match(markup, /class="map-themes-header"/);
  assert.doesNotMatch(markup, /popover=|<form/);
  button.click();
  assert.equal(removed, true);
  const screenshot = readFileSync(new URL('../../../src/static/map-controls/screenshot.js', import.meta.url), 'utf8');
  assert.match(screenshot, /title:\s*'print',[\s\S]*?modal:\s*true/);
  assert.match(screenshot, /mapInteractive:\s*true/);
});

test('dragging a centered dialog uses viewport coordinates and leaves buttons interactive', () => {
  const source = readFileSync(new URL('../../../src/g3w-app.js', import.meta.url), 'utf8');
  const start = source.indexOf('  #makeDraggable(el, handle = el) {');
  const end = source.indexOf('\n  async showUserMessage', start);
  const listeners = new Map();
  let pointerDown;
  let keyDown;
  const gui = runInNewContext(`(new class {${source.slice(start, end).replace('#makeDraggable', 'makeDraggable')}})`, {
    document: {
      addEventListener: (name, callback) => listeners.set(name, callback),
      removeEventListener: name => listeners.delete(name),
    },
  });
  const dialog = {
    style: { margin: 'auto' },
    getBoundingClientRect: () => ({ top: 200, left: 300 }),
  };
  const header = { style: {}, addEventListener: (name, callback) => {
    if (name === 'pointerdown') pointerDown = callback;
    if (name === 'keydown') keyDown = callback;
  } };
  gui.makeDraggable(dialog, header);
  assert.equal(header.tabIndex, 0);
  keyDown({ key: 'ArrowRight', target: header, preventDefault() {} });
  assert.equal(dialog.style.left, '310px');
  pointerDown({ button: 0, target: { closest: () => true } });
  assert.equal(listeners.size, 0);
  pointerDown({ button: 0, clientX: 310, clientY: 210, target: { closest: () => null }, preventDefault() {} });
  assert.equal(dialog.style.margin, '0');
  listeners.get('pointermove')({ clientX: 350, clientY: 240, preventDefault() {} });
  assert.equal(dialog.style.left, '340px');
  assert.equal(dialog.style.top, '230px');
  listeners.get('pointercancel')();
  assert.equal(listeners.size, 0);
});

test('tool dialogs replace each other and close Print before opening', () => {
  const guiSource = readFileSync(new URL('../../../src/g3w-app.js', import.meta.url), 'utf8');
  const start = guiSource.indexOf('  showToolDialog(dialog) {');
  const end = guiSource.indexOf('\n  /**', start);
  let printOpen = true;
  const dialog = (mapInteractive = false) => ({
    open: false,
    hasAttribute: name => name === 'data-map-interactive' && mapInteractive,
    show() { this.open = true; this.blocking = false; },
    showModal() { this.open = true; },
    close(value) { this.open = false; this.returnValue = value; },
  });
  const themes = dialog();
  const bookmarks = dialog();
  const document = {
    querySelector: () => printOpen ? { hasAttribute: () => false, hidePopover() { printOpen = false; } } : null,
    querySelectorAll: () => [themes, bookmarks].filter(item => item.open),
  };
  const gui = runInNewContext(`(new class {${guiSource.slice(start, end)}})`, { document });
  gui.showToolDialog(themes);
  assert.equal(printOpen, false);
  assert.equal(themes.open, true);
  gui.showToolDialog(bookmarks);
  assert.equal(themes.open, false);
  assert.equal(themes.returnValue, 'replace');
  assert.equal(bookmarks.open, true);
  const print = dialog(true);
  gui.showToolDialog(print);
  assert.equal(bookmarks.open, false);
  assert.equal(print.open, true);
  assert.equal(print.blocking, false);
  gui.closeToolDialogs();
  assert.equal(bookmarks.open, false);
  assert.match(guiSource, /if \('tool' === type\) \{\s*this.closeToolDialogs\(\);/);
});

test('bookmark component compiles and its add form uses the exclusive dialog flow', () => {
  const source = readFileSync(new URL('../../../src/components/SpatialBookMarks.vue', import.meta.url), 'utf8');
  const descriptor = parse({ source, filename: 'SpatialBookMarks.vue' });
  assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename: 'SpatialBookMarks.vue', id: 'bookmarks' }).errors, []);
  assert.doesNotThrow(() => transformSync(descriptor.script.content, { format: 'cjs' }));
  assert.doesNotThrow(() => transformSync(descriptor.styles[0].content, { loader: 'css' }));
  assert.match(source, /GUI.showToolDialog\(this.\$refs.add_bookmark\)/);
  assert.match(source, /for = "add-bookmark"/);
  assert.doesNotMatch(source, /:hidden\s*=\s*"is_mobile"/);
});

test('theme controls have an accessible icon-only add button and native actions', () => {
  const themes = descriptor.template.content.split('id = "g3w-themes"')[1].split('<!-- ADD NEW MAP THEME (FORM) -->')[0];
  const add = themes.match(/<button\b[^>]*class\s*=\s*"map-theme-add"[^>]*>[\s\S]*?<\/button>/)[0];
  assert.match(add, /:aria-label\s*=\s*"\$t\('add'\)"/);
  assert.match(add, /:data-i18n-title\s*=\s*"'add'"/);
  assert.match(add, /<i aria-hidden\s*=\s*"true" class\s*=\s*"fas fa-plus"><\/i>/);
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

test('restores the previously selected sidebar when a collapsible component closes', async () => {
  for (const previousSidebar of ['catalog', 'legend']) {
    const env = setup();
    const component = {
      id: 'qplotly', collapsible: true, open: false,
      getOpen() { return this.open; },
      click({ open }) { this.open = open; },
    };
    env.context.selected_sidebar = previousSidebar;
    env.state.sidebar.components.push(component);
    await env.select('qplotly');
    assert.equal(env.context.activeSidebarId, 'qplotly');
    component.click({ open: false });
    assert.equal(env.context.activeSidebarId, previousSidebar);
  }
});

test('closing charts hides an open collapsible control without opening the catalog', async () => {
  const env = setup();
  env.state.sidebar.open = true;
  env.state.sidebar.components.push({
    id: 'qplotly',
    collapsible: true,
    getOpen: () => true,
  });
  await env.app.methods.closeContent.call(env.context);
  assert.equal(env.state.sidebar.open, false);

  env.state.sidebar.open = true;
  env.state.sidebar.components[0].getOpen = () => false;
  await env.app.methods.closeContent.call(env.context);
  assert.equal(env.state.sidebar.open, true);
});

test('closing search results restores the search list and keeps search open', async () => {
  const env = setup();
  env.state.sidebar.open = true;
  env.state.sidebar.components.push({
    id: 'search',
    collapsible: true,
    getOpen: () => true,
  });
  env.context.panels.push('search-panel');

  await env.app.methods.closeContent.call(env.context);

  assert.deepEqual(env.context.panels, []);
  assert.equal(env.state.sidebar.open, true);
  assert.equal(env.context.activeSidebarId, 'search');
});

test('closing a stacked search panel shows the panel underneath', async () => {
  const env = setup();
  const search = {
    id: 'search', collapsible: true, open: true,
    getOpen() { return this.open; },
    click({ open }) { this.open = open; },
  };
  env.state.sidebar.components.push(search);
  env.state.sidebar.open = true;
  env.context.selected_sidebar = 'search';
  env.context.panels.push('search-list-panel', 'search-form-panel');

  await env.context.closeSidebar();

  assert.deepEqual(env.context.panels, ['search-list-panel']);
  assert.equal(search.open, true);
  assert.equal(env.state.sidebar.open, true);
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