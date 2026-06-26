/**
 * @file
 * @since 3.11.0
 */

import Emitter          from 'g3w-emitter';
import Component        from 'g3w-component';
import ApplicationState from 'g3w-state';
import GUI              from 'g3w-app';
import { toRawType }    from 'utils/toRawType';
import { cloneDeep }    from 'utils/cloneDeep';
import { waitFor }      from 'utils/waitFor';
import { gettext as _ } from 'g3w-i18n';

const TIMEOUT = 10000;

/**
 * ORIGINAL SOURCE: src/app/core/plugin/plugin.js@v3.10.2
 */
export class Plugin extends Emitter {
  
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
    this.setHookService(null);

    this._ready = false;

    // List of sidebar services that usually plugin need to interact with (hook = place/name of component)
    this.hookservices = {
      'search': GUI.getService('search'),
      'tools':  GUI.getService('tools')
    };

    // Automatically remove the loading plugin indicator after timeout
    this._timeout = setTimeout(() => {
      ApplicationState.plugins = ApplicationState.plugins.filter(p => this.name !== p); // remove loading plugin
      // remove layout
      if (this.name) {
        delete ApplicationState.layout[this.name];
      }
    }, TIMEOUT);

  }

  /**
   * Set plugin name
   * @param { String } name
   */
  setName(name) {
    this.name = name;
  }

  /**
   * Get plugin name
   * @returns { String } name
   */
  getName() {
    return this.name;
  }

  /**
   * @since 4.1.0
   * Set i18n translations lang for the plugin
   * @param { String | Object } i18n 
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

      Vue.watch(() => ApplicationState.language, async lang => {
        try {
          this.setLocale({ [lang]: (await import(`${i18n.replace(/\/+$/, '')}/${lang}.js`)).default });
        } catch(e) {
          console.warn(e);
        }
      }, { immediate: true });
    }
  }

  /**
   * Set plugin configuration
   * @param { Object } config
   */
  setConfig(config) {
    this.config = 'Object' === toRawType(config) ? config : null;
  }

  /**
   * Get plugin configuration
   * @param { String } name
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
   * @FIXME add description
   */
  setService(service) {
    this.service = service;
    if (service) {
      service.setPlugin(this);
    }
  }

  /**
   * @FIXME add description
   */
  getService() {
    return this.service;
  }

  /**
   * @FIXME add description
   * @param { Array } dependencies
   */
  setDependencies(dependencies = []) {
    this.dependencies = dependencies;
  }

  /**
   * @FIXME add description
   */
  setApi(api = {}) {
    this._api = api;
    /**
     * @FIXME useless assignment ?
     */
    api.getConfig = this._api.getConfig; // add alias for "api.getConfig()" method
  }

  /**
   * @FIXME add description
   */
  getApi() {
    return this._api;
  }

  /**
   * @FIXME add description
   */
  setHookService(hook) {
    this._hook = hook;
  }

  /**
   * @FIXME add description
   */
  getHookService(hook = "tools") {
    return this.hookservices[hook];
  }

  /**
   * Override plugin's content default layout (eg. default panel width, height, ...)
   * 
   * @see g3wsdk.core.ApplicationState.layout
   */
  setLayout(config) {
    config = config ?? cloneDeep(ApplicationState.layout.app);

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
   * @FIXME add description
   * 
   * @see g3wsdk.core.ApplicationState.layout.__current
   */
  setCurrentLayout() {
    ApplicationState.layout.__current = this.name;
  }

  /**
   * @FIXME add description
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
   * @FIXME add description
   */
  isReady() {
    return new Promise((resolve) => {
      this._ready
        ? resolve(this._ready)
        : this.once('set-ready', isReady => { this._ready = isReady; resolve(this._ready); })
    });
  }

  /**
   * @returns whether plugin is compatible with current projectId
   */
  isCurrentProjectCompatible(gid) {
    return gid === ApplicationState.project.getGid();
  }

  /**
   * Check and register plugin only when compatible with current projectId (eg: qdjango:1)
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
   * Used by the following plugins: "archiweb"
   * 
   * Get plugin dependencies
   */
  getDependencyPlugins(pluginsName) {
    this.dependencies = pluginsName || this.dependencies;
    return Promise.all(this.dependencies.map(name => this.getDependencyPlugin(name)))
  }

  /**
   * Used by the following plugins: "iframe", "sispi-worksite", "simplereporting"
   */
  async getDependencyPluginsObject(pluginsName) {
    const api      = {};
    const promises = await this.getDependencyPlugins(pluginsName);
    this.dependencies.forEach((name, index) => api[name] = promises[index]);
    return api;
  }

  /**
   * @deprecated plugin APIs are deprecated, use `GUI.getPlugin(name)` instead.
   */
  async getDependencyPlugin(pluginName) {
    // is there a plugin
    if (window.initConfig.plugins[pluginName]) {
      await waitFor(() => GUI.getPlugin(pluginName)?.isReady?.());
      return GUI.getPlugin(pluginName).getApi();
    }
    return Promise.reject({ error: 'no plugin' });
  }

  /**
   * Handle a loading process of a specific hook service (e.g. "tools" interface on the left sidebar)
   */
  setHookLoading({ hook = "tools", loading = false } = {}) {
    this.getHookService(hook).setLoading(loading);
  }

  /**
   * @FIXME add description
   */
  addToolGroup({ hook = "tools", position:order, title:group } = {}) {
    this.getHookService(hook).addToolGroup(order, group);
  }

  /**
   * @FIXME add description
   */
  removeToolGroup({ hook, group } = {}) {
    this.getHookService(hook).removeToolGroup(group.title);
  }

  /**
   * @param tool
   * @param group tools group
   */
  addTools(tool, group) {
    const hook = tool.hook || 'tools';
    let tools  = [];

    if (!tool.action && !tool.type) {
      this.removeToolGroup({ hook, group });
    } else {
      this.setHookService(hook);
      tools = (this.config.configs || [this.config]).map(config => {
          return {
          icon:     tool.icon,
          type:     tool.type,
          name:     config?.name ?? tool.name,
          html:     tool.html,
          options:  tool.options || {},
          action:   tool?.action?.bind?.(this, config),
          loading:  tool?.loading ?? false,
          disabled: tool?.disabled ?? false,
          offline:  tool?.offline ?? true,
          state:    tool?.state ?? ({ type: null, message: null })
        };
      });
      this.getHookService(hook).addTools(tools, group);
    }

    return tools;
  }

  /**
   * @FIXME add description
   */
  setToolState({ id, state = { type: null, message: null } } = {}) {
    this.hookservices[this._hook].state.toolsGroups.find(g => {
      const tool = g.tools.find(t => t.name === id);
      if (tool) {
        tool.state.type    = state.type;
        tool.state.message = state.message;
        return true;
      }
    });
  }

  /**
   * @FIXME add description
   */
  removeTools() {
    this.hookservices[this._hook].removeTools();
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
 * - "iternet",
 * - "geonotes",
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