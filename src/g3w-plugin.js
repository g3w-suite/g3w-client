/**
 * @file
 * @since 3.11.0
 */

import Emitter          from 'g3w-emitter';
import Component        from 'g3w-component';
import ApplicationState from 'g3w-state';
import GUI              from 'g3w-app';
import Observable,
 { unByKey }            from 'ol/Observable';
import { toRawType }    from 'utils/toRawType';
import { gettext as _ } from 'g3w-i18n';

/**
 * ORIGINAL SOURCE: src/app/core/plugin/plugin.js@v3.10.2
 */
export class Plugin extends Emitter {
  #app = GUI; //get app
  constructor({
    name         = null,
    config       = window.initConfig.plugins[name],
    service      = null,
    dependencies = [],
    /** @type { Object | string } a i18n object or a path to i18n folder (lazy loading) */
    i18n         = null,
    fontClasses  = [],
    api          = {},
  } = {}) {
  
    super();

    this.setName(name);
    this.setConfig(config);
    this.setI18n(i18n);
    this.setService(service);
    this.setDependencies(dependencies);
    this.addFontClasses(fontClasses);
    this.setApi(api);

    this._ready = false;

    // Automatically remove the loading plugin indicator after timeout
    this._timeout = setTimeout(() => {
      ApplicationState.plugins = ApplicationState.plugins.filter(p => this.name !== p); // remove loading plugin
      // remove layout
      if (this.name) {
        delete ApplicationState.layout[this.name];
      }
    }, 10000); // 10 seconds

  }

  /**
   * 
   * @returns Get app object 
   */
  getApp() {
    return this.#app;
  }

  /**
   * @param { String } name plugin name
   */
  setName(name) {
    this.name = name;
  }

  /**
   * @returns { String } plugin name
   */
  getName() {
    return this.name;
  }

  /**
   * @param { String | Object } i18n translations lang for the plugin
   * 
   * @since 4.1.0
   */
  async setI18n(i18n) {
    //In case of missing i18n configuration, do nothing
    if (!i18n) { 
      return; 
    }

    // i18n object
    if ('object' === typeof i18n) {
      this.setLocale(i18n);
    }

    // lazy load i18n
    if ('string' === typeof i18n) {
      try {
        //Need to load default en translations before loading
        const en = (await import(`${i18n.replace(/\/+$/, '')}/en.js`))?.default;
        //In case of missing language file, fallback to "en" and log missing translation
        this.setLocale({ en });
      } catch(e) {
        console.warn(e);
      }

      this.listen(() => ApplicationState.language, async lang => {
        try {
          this.setLocale({ [lang]: (await import(`${i18n.replace(/\/+$/, '')}/${lang}.js`)).default });
        } catch(e) {
          console.warn(e);
        }
      }, { immediate: true });
    }
  }

  /**
   * @param { Object } config plugin configuration
   */
  setConfig(config = {}) {
    this.config = 'Object' === toRawType(config) ? config : null;
  }

  /**
   * @param { String } name plugin name
   * 
   * @returns plugin configuration
   */
  getConfig(name) {
    return this.config || window.initConfig.plugins[name || this.name];
  }

  /**
   * Register custom i18n strings (global context)
   * 
   * @param { string } lang 
   * @param {*} locale i18n object
   * 
   * @since 4.0.0
   */
  registerLocale(lang, locale) {
    _.register(lang, locale);
  }

  /**
   * Register custom i18n strings (plugin context)
   * 
   * @param {*} locale i18n object
   */
  setLocale(locale) {
    if (locale && this.name) {
      for (const lang in locale) {
        _.register(lang, { plugins: { [this.name]: locale[lang] } });
      }
    }
  }

  /**
   * @param { Object } service plugin service functionality (methods, events, ...) to interact with the plugin
   * 
   * @since 4.0.0
   */
  setService(service) {
    this.service = service;
    if (service) {
      service.setPlugin(this);
    }
  }

  /**
   * @returns { Object } plugin service functionality (methods, events, ...) to interact with the plugin
   * 
   * @since 4.0.0 
   */
  getService() {
    return this.service;
  }

  /**
   * @param { Array } dependencies plugin dependencies (eg. ["editing", "processing"])
   */
  setDependencies(dependencies = []) {
    this.dependencies = dependencies;
  }

  /**
   * Set plugin API that expose plugin interaction from external
   *   
   * @param { Object } api
   * 
   * @since 4.0.0
   */
  setApi(api = {}) {
    this._api = api;
    /**
     * @FIXME useless assignment ?
     */
    api.getConfig = this._api.getConfig; // add alias for "api.getConfig()" method
  }

  /**
   * Return plugin API that expose plugin interaction from external
   * 
   * @returns { Object }
   * 
   * @since 4.0.0
   */
  getApi() {
    return this._api;
  }


  /**
   * Override plugin's content default layout (eg. default panel width, height, ...)
   * 
   * @see g3wsdk.core.ApplicationState.layout
   */
  setLayout(config) {
    config = config ?? structuredClone(ApplicationState.layout.app);

    const default_config = config.rightpanel || {
      width:          50, // ie. width == 50%
      height:         50, // ie. height == 50%
      width_100:      false,
      height_100:     false,
    };

    config.rightpanel = Object.assign(
      default_config,
      {
        width:          config.rightpanel.width  || default_config.width,
        height:         config.rightpanel.height || default_config.width,
        width_100:      false,
        height_100:     false,
      }
    );

    ApplicationState.layout[this.name] = config;

  }

  /**
   * Set the current layout of the plugin as active
   * 
   * @see g3wsdk.core.ApplicationState.layout.__current
   */
  setCurrentLayout() {
    ApplicationState.layout.__current = this.name;
  }

  /**
   * Set the plugin as ready (eg. after initialization is complete)
   * 
   * @param { boolean } isReady
   */
  setReady(isReady) {
    this._ready = isReady;
    if (this._ready) {
      this.setLayout();
    }
    this.emit('set-ready', isReady, this.name);
    setTimeout(() => {
      clearTimeout(this._timeout);
      ApplicationState.plugins = ApplicationState.plugins.filter(p => this.name !== p); // remove loading plugin
    }, 0 /* 0 = allow any previously "setTimeout" to execute */)
  }

  /**
   * Return a promise that resolves when the plugin is ready (eg. after "setReady(true)" is called)
   * 
   * @returns { Promise }
   * 
   * @since 4.0.0
   */
  isReady() {
    return new Promise((resolve) => {
      this._ready
        ? resolve(this._ready)
        : this.once('set-ready', isReady => { this._ready = isReady; resolve(this._ready); })
    });
  }

  /**
   * @param { string } gid plugin's gid (eg: qdjango:1)
   * 
   * @returns whether plugin is compatible with current projectId
   */
  isCurrentProjectCompatible(gid) {
    return gid === ApplicationState.project.getGid();
  }

  /**
   * Check and register plugin only when compatible with current projectId (eg: qdjango:1)
   * 
   * @param { string } gid plugin's gid (eg: qdjango:1)
   * 
   * @returns { boolean } whether plugin is compatible with current projectId
   */
  registerPlugin(gid) {
    const iscompatible  = this.isCurrentProjectCompatible(gid);
    if (iscompatible) {
      GUI.registerPlugin(this);
    } else {
      ApplicationState.plugins = ApplicationState.plugins.filter(p => this.name !== p); // remove loading plugin
      clearTimeout(this._timeout);
    }
    return iscompatible;
  }

  /**
   * Wait until another plugin is ready and return it.
   * 
   * @param { string | string[] } name plugin name (eg. 'editing') or a list of names
   * 
   * @returns { Promise<Plugin | Plugin[]> } rejects when the plugin is not available on the current project
   * 
   * @example
   * const editing = await this.waitForPlugin('editing');
   * editing.startEditing(layerId);
   * 
   * @since 4.2.0
   */
  async waitForPlugin(name) {
    if (Array.isArray(name)) {
      return Promise.all(name.map(n => this.waitForPlugin(n)));
    }

    const config = window.initConfig.plugins[name];
    if (!config || (config.gid && !this.isCurrentProjectCompatible(config.gid))) {
      throw new Error(`[G3W-CLIENT] plugin "${name}" is not available on this project`);
    }

    // returning true removes the listener (see Emitter.trigger)
    const plugin = GUI.getPlugin(name) || await new Promise(resolve => GUI.onafter('registerPlugin', p => name === p.name && (resolve(p), true)));

    await plugin.isReady();

    return plugin;
  }

  /**
   * Used by the following plugins: "archiweb"
   * 
   * @param { Array } pluginsName plugin dependencies
   * 
   * @since 4.0.0
   * 
   * @deprecated since 4.2.0, use `this.waitForPlugin(names)` instead
   */
  getDependencyPlugins(pluginsName) {
    this.dependencies = pluginsName || this.dependencies;
    return Promise.all(this.dependencies.map(name => this.getDependencyPlugin(name)))
  }

  /**
   * Used by the following plugins: "iframe", "sispi-worksite", "simplereporting"
   * 
   * @returns { Object } plugin dependencies API
   * 
   * @since 4.0.0
   * 
   * @deprecated since 4.2.0, use `this.waitForPlugin(names)` instead
   */
  async getDependencyPluginsObject(pluginsName) {
    const api      = {};
    const promises = await this.getDependencyPlugins(pluginsName);
    this.dependencies.forEach((name, index) => api[name] = promises[index]);
    return api;
  }

  /**
   * @deprecated plugin APIs are deprecated, use `this.waitForPlugin(name)` instead.
   */
  async getDependencyPlugin(pluginName) {
    try {
      return (await this.waitForPlugin(pluginName)).getApi();
    } catch (e) {
      return Promise.reject({ error: 'no plugin' });
    }
  }

  /**
   * Helper method to create and add a custom component item on the left sidebar
   * 
   * @param                      vue                               vue component object (SFC)
   * @param { Object }           opts
   * @param { string }           opts.id
   * @param { string }           opts.title                        textual description on left sidebar (eg. "metadata")
   * @param { boolean }          opts.open                         true = collapsible button; false = button
   * @param { boolean }          opts.collapsible                  whether expand the button when plugin is loaded
   * @param { boolean }          opts.closewhenshowviewportcontent
   * @param { Object }           opts.iconConfig
   * @param { string }           opts.iconConfig.color             color of icon
   * @param { string }           opts.iconConfig.icon              see gui\vue\vueappplugin.js font list
   * @param { Object }           opts.events                       eg. events = { open: { when: 'before', cb: () => { } }
   * @param { Object }           opts.sidebarOptions
   * @param { number | string }  opts.sidebarOptions.position
   * 
   * @returns component
   * 
   * @listens unload
   * 
   * @deprecated since 4.2.0, use `this.addSidebarItem()` instead
   */
  createSideBarComponent(vue, opts = {}) {

    opts.vueComponentObject = vue; 
    opts.collapsible        = opts.collapsible    ?? true;
    opts.mobile             = opts.mobile         ?? true;
    opts.sidebarOptions     = opts.sidebarOptions ?? { position: 1 };

    GUI.addComponent(new Component(opts), opts.sidebarOptions);
    
    return GUI.getComponent(opts.id) ;
  }

  /**
   * Listen to any kind of event with a single syntax.
   * 
   * @param { Emitter | ol.Observable | Function } target GUI, layer, component, OpenLayers map/source/interaction or a getter function (reactive watch)
   * @param { string | Function } event  event name, `'before:<method>'` / `'after:<method>'` to run code around any method call, or the handler when target is a getter
   * @param { Function | Object } handler event handler or watch options when target is a getter
   * @param { Object }  opts
   * @param { boolean } opts.once remove the listener after the first call
   * 
   * @returns { Function } call it to stop listening
   * 
   * @example
   * this.listen(GUI, 'ready', () => {});
   * this.listen(GUI.getComponent('metadata'), 'after:setOpen', open => {});
   * this.listen(GUI, 'before:closeContent', () => {});
   * this.listen(GUI.getMap(), 'click', e => console.log(e.coordinate));
   * const off = this.listen(() => ApplicationState.language, lang => {}, { immediate: true });
   * off();
   * 
   * @since 4.2.0
   */
  listen(target, event, handler, opts = {}) {
    if ('function' === typeof target) {
      return Vue.watch(target, event, handler);
    }

    const once = !!opts.once;

    if (target instanceof Emitter) {
      // plain events can also start with "after:" (eg. 'after:setupControls'), so map only real methods
      const [, when, method] = /^(before|after):(.+)$/.exec(event) || [];
      const evt = 'function' === typeof target[method] ? `on${when}:${method}` : event;
      const key = target.on(evt, handler, undefined, once, true);
      // undefined key = duplicated listener, and `off(evt, undefined)` would remove all listeners
      return () => key && target.off(evt, key);
    }

    if (target instanceof Observable) {
      const key = once ? target.once(event, handler) : target.on(event, handler);
      return () => unByKey(key);
    }

    console.warn('[G3W-CLIENT] unsupported event target', target);
    return () => {};
  }

  /**
   * Add an item on the left sidebar.
   * 
   * @param { Object }          opts
   * @param { string }          opts.id
   * @param { string }          opts.title       i18n key or text
   * @param { string }          opts.icon        icon name (eg. 'pencil') or css class
   * @param { string }          opts.color       icon color
   * @param { Object }          opts.component   vue component object (SFC) shown when the item is open
   * @param { number | string } opts.position    index or id of a sidebar item to insert before
   * @param { boolean }         opts.open
   * @param { boolean }         opts.collapsible false = simple button (no content)
   * @param { boolean }         opts.mobile      show on mobile devices
   * @param { Function }        opts.onOpen
   * @param { Function }        opts.onClose
   * 
   * @returns {{ component: Component, off: Function }}
   * 
   * @example
   * this.addSidebarItem({ id: 'hello', title: 'Hello', icon: 'info', collapsible: false, onOpen: () => alert('hello') });
   * 
   * @since 4.2.0
   */
  addSidebarItem({ id, title, icon, color, component = {}, position = 1, open = false, collapsible = true, mobile = true, onOpen, onClose } = {}) {
    const comp = this.createSideBarComponent(component, { id, title, icon, iconColor: color, open, collapsible, mobile, sidebarOptions: { position } });

    // not added (eg. `mobile: false` on a mobile device)
    if (!comp) {
      return { component: comp, off: () => {} };
    }

    const unlisten = this.listen(comp, 'after:setOpen', bool => bool ? onOpen?.(comp) : onClose?.(comp));

    return {
      component: comp,
      off: () => { unlisten(); GUI.removeComponent(id); },
    };
  }

  /**
   * Add a map control.
   *
   * @param { Object } opts
   * @param { string } opts.id
   * @param { boolean } [opts.add=true] whether to add it to the map controls
   * @param { string } opts.label
   * @param { Function } opts.onclick
   *
   * @returns { MapControl }
   *
   * @example
   * this.addMapControl({ id: 'hello', label: 'Hello', onclick: () => alert('hello') });
   *
   * @since 4.2.0
   */
  addMapControl({ id, add = true, ...options } = {}) {
    return GUI.createMapControl(id, { add, options });
  }

  /**
   * Add a button on each feature of the results.
   * 
   * @param { Object }              opts
   * @param { string }              opts.id
   * @param { string }              opts.icon      icon name (eg. 'pencil') or css class
   * @param { string }              opts.hint      tooltip (i18n key or text)
   * @param { string[] | Function } opts.layers    layer ids or `layer => boolean` (default: all layers)
   * @param { Function }            opts.condition `({ layer, feature }) => boolean` show the button only for some features
   * @param { number | string }     opts.position  index, `'before:<action id>'` or `'after:<action id>'` (default: last)
   * @param { boolean }             opts.toggle    button keeps a pressed state (passed as `toggled` to onClick)
   * @param { Function }            opts.onClick   `({ layer, feature, index, container, action, toggled }) => {}`
   * @param { Function }            opts.onClear   called when query results are closed
   * 
   * @returns { Function } call it to remove the action
   * 
   * @example
   * this.addResultAction({ id: 'log', icon: 'info', hint: 'Log', onClick: ({ feature }) => console.log(feature) });
   * 
   * @since 4.2.0
   */
  addResultAction({ id, icon, hint, layers, condition, position, toggle = false, onClick, onClear } = {}) {
    return this.listen(GUI, 'after:addActionsForLayers', (actions, queried = []) => {
      queried.forEach(layer => {
        const list = actions[layer.id];
        if (
          !list || list.some(a => id === a.id) ||
          (Array.isArray(layers) && !layers.includes(layer.id)) ||
          ('function' === typeof layers && !layers(layer))
        ) {
          return;
        }

        const [where, ref] = 'string' === typeof position ? position.split(':') : [];
        const i            = list.findIndex(a => ref === a.id);

        list.splice('number' === typeof position ? position : (-1 === i ? list.length : i + ('after' === where ? 1 : 0)), 0, {
          id,
          hint,
          condition,
          class: Vue.prototype.$fa?.(icon) ?? icon,
          state: Vue.observable({ toggled: {} }),
          clear: onClear,
          cbk(layer, feature, action, index, container) {
            if (toggle) {
              Vue.set(action.state.toggled, index, !action.state.toggled[index]);
            }
            return onClick?.({ layer, feature, index, container, action, toggled: !!action.state.toggled[index] });
          },
        });
      });
    });
  }

  /**
   * Add an item on the context menu (right click).
   * 
   * @param { Object }            opts
   * @param { string | string[] } opts.context   'map', 'layer', 'project' (catalog root) or a list of them
   * @param { string }            opts.label     i18n key or text
   * @param { string }            opts.icon      icon name (eg. 'pencil') or css class
   * @param { number }            opts.position  css order (lower = first)
   * @param { Function }          opts.condition `({ context, layer, coordinate }) => boolean`
   * @param { Function }          opts.onClick   `({ context, layer, coordinate }) => {}`
   * @param { Array }             opts.children  sub menu items: `[{ label, onClick }]`
   * 
   * @returns { Function } call it to remove the item
   * 
   * @example
   * this.addContextMenuItem({ context: 'layer', label: 'Log layer', icon: 'info', onClick: ({ layer }) => console.log(layer) });
   * 
   * @since 4.2.0
   */
  addContextMenuItem({ context = 'map', label, icon, position, condition, onClick, children } = {}) {
    const offs = [].concat(context).map(ctx => this.listen(GUI, `${ctx}:context-menu`, menu => {
      const info = { context: ctx, layer: menu.layer, coordinate: menu.map_coords };
      if (condition && !condition(info)) {
        return;
      }
      menu.items.push({
        label,
        icon,
        position,
        cbk:      onClick && (() => onClick(info)),
        children: children?.map(c => ({ label: c.label, cbk: () => c.onClick?.(info) })),
      });
    }));
    return () => offs.forEach(off => off());
  }

  /**
   * @TODO depecrate?
   * 
   * used by the following plugins: "processing"
   */
  getProject() {
    return ApplicationState.project;
  }

  /**
   * @TODO it could be depecrated after v3.4 ?
   */
  addDependency(dependency) {
    this.dependencies.push(dependency);
  };

  /**
   * @TODO it could be depecrated after v3.4 ?
   */
  addFontClass({ name, className }) {
    Vue.prototype.g3wtemplate.addFontClass({ name, className });
  }

  /**
   * @TODO it could be depecrated after v3.4 ?
   */
  addFontClasses(fontClasses = []) {
    fontClasses.forEach(fc => this.addFontClass(fc));
  }

  /**
   * @deprecated since v4.2.0
   */
  setHookLoading() {}

}

/**
 * ORIGINAL SOURCE: src/app/core/plugin/pluginservice.js@v3.10.2
 * 
 * Used by the following plugins:
 * - "bforest",
 * - "fsimulator",
 * - "gsk",
 * - "ws-trento",
 * - "br-service",
 * - "cdu",
 * - "billboards",
 * - "politowps",
 * - "law",
 * - "cadastre",
 * - "simplereporting"
 * - "sispi-worksite",
 * - "stress",
 * - "archiweb",
 * - "datasinc",
 * - "arpalombardia-charts",
 * - "innovapuglia",
 * - "iframe",
 * - "openrouteservice",
 * - "qtimeseries",
 * 
 * @deprecated use `new (class extends Plugin {})` instead
 */
export class PluginService extends Emitter {

  constructor(opts = {}) {
    super(opts);
    this.plugin;
    this._api = {
      own:          null,
      dependencies: {}
    };
    this._pluginEvents = {};
    this._appEvents    = [];
    this.currentLayout = ApplicationState.layout.__current;
    this.vm = new Vue();
    this.unwatch = this.vm.$watch(
      () =>         ApplicationState.layout.__current,
      layoutName => this.currentLayout = layoutName === this.name ? this.currentLayout : layoutName
    )
  }

  /**
   * @param config: plugin configuration object
   * 
   * @virtual method need to be implemented by subclasses
   */
  init(config = {}) {
    this.config = config;
  }

  resetCurrentLayout() {
    ApplicationState.layout.__current = this.currentLayout;
  }

  // set owner plugin of the service
  setPlugin(plugin) {
    this.plugin = plugin;
  }

  // return the instance of the plugin owner of the service
  getPlugin() {
    return this.plugin;
  }

  isIframe() {
    return ApplicationState.iframe;
  }

  getCurrentProject() {
    return ApplicationState.project;
  }

  getGid() {
    return this.config?.gid?.split?.(':')[1];
  }

  getConfig() {
    return this.config;
  }

  setConfig(config) {
    this.config = config;
  }

  setApi({ dependency, api } = {}) {
    if (!dependency) { this._api.own = api }
    else { this._api.dependencies[dependency] = api }
  }

  getApi({ dependency } = {}) {
    return dependency && this._api.dependencies[dependency] || this._api.own;
  }

  initEvents(events = []) {
    for (let i in events) {
      this._pluginEvents[events[i]] = {};
    }
  }

  subscribeEvent({ name, once = false, owner, listener } = {}) {
    this._pluginEvents[name]        = this._pluginEvents[name] ? this._pluginEvents[name] : {};
    this._pluginEvents[name][owner] = listener;
    if (once) {
      this.once(name, listener);
    } else {
      this.on(name, listener);
    }
  }

  triggerEvent({ name, params = {} }) {
    this.emit(name, params);
  }

  unsubscribeEvent({ name, owner }) {
    this.removeEvent(name, this._pluginEvents[name][owner]);
    delete this._pluginEvents[name][owner];
  }

  unsubscribeAllEvents() {
    for (const name in this._pluginEvents) {
      this.removeEvent(name);
      delete this._pluginEvents[name];
    }
  }

  clearAllEvents() {
    this.unsubscribeAllEvents();
    this.unwatch();
    this.vm            = null;
    this._pluginEvents = null
  }

  /**
   * @returns need to load or not the plugin
   * 
   * @virtual method need to be implemented by subclasses 
   */ 
  loadPlugin() {
    return true
  }

  /**
   * Called when plugin is removed to clear events and memory
   * 
   * @virtual method need to be implemented by subclasses
   */
  clear() {}

}