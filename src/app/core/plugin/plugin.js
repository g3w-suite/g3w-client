import G3WObject          from 'core/g3w-object';
import Component          from 'core/g3w-component';
import PluginsRegistry    from 'store/plugins';
import ProjectsRegistry   from 'store/projects';
import ApplicationService from 'services/application';
import GUI                from 'services/gui';
import { toRawType }      from 'utils/toRawType';

const { addI18nPlugin } = require('core/i18n/i18n.service');

const TIMEOUT = 10000;

module.exports = class Plugin extends G3WObject {
  
  constructor({
    name         = null,
    config       = PluginsRegistry.getPluginConfig(name),
    service      = null,
    dependencies = [],
    i18n         = null,
    fontClasses  = [],
    api          = {},
  } = {}) {
  
    super();

    this.setName(name);
    this.setConfig(config);
    this.setLocale(i18n);
    this.setService(service);
    this.setDependencies(dependencies);
    this.addFontClasses(fontClasses);
    this.setApi(api);
    this.setHookService(null);

    this._ready = false;

    // List of sidebar services that usually plugin need to interact with (hook = place/name of component)
    this.hookservices = {
      'search': GUI.getService('search'),
      'tools': GUI.getService('tools')
    };

    // Automatically remove the loading plugin indicator after timeout
    this._timeout = setTimeout(() => {
      ApplicationService.loadedPlugin(this.name, this._ready); // remove loading plugin
      this.removeLayout();
    }, TIMEOUT)

  }

  /**
   * @FIXME add description
   */
  setName(name) {
    this.name = name;
  }

  /**
   * @FIXME add description
   */
  getName() {
    return this.name;
  }

  /**
   * @FIXME add description
   */
  setConfig(config) {
    this.config = toRawType(config) === 'Object' ? config : null;
  }

  /**
   * @FIXME add description
   */
  getConfig(name = this.name) {
    return this.config || PluginsRegistry.getPluginConfig(name);
  }

  /**
   * @FIXME add description
   */
  setLocale(i18n) {
    if (i18n && this.name) {
      addI18nPlugin({ name: this.name, config: i18n});
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
    return this.service
  }

  /**
   * @FIXME add description
   */
  setDependencies(dependencies) {
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
   * @see g3wsdk.core.ApplicationState.gui.layout
   */
  setLayout(config = ApplicationService.cloneLayout('app')) {
    ApplicationService.setLayout(this.name, config);
  }

  /**
   * @FIXME add description
   * 
   * @see g3wsdk.core.ApplicationState.gui.layout.__current
   */
  setCurrentLayout() {
    ApplicationService.setCurrentLayout(this.name);
  }

  /**
   * @FIXME add description
   * 
   * @see g3wsdk.core.ApplicationState.gui.layout
   */
  removeLayout() {
    ApplicationService.removeLayout(this.name)
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
      ApplicationService.loadedPlugin(this.name, this._ready); // remove loading plugin
    }, 0 /* 0 = allow any previously "setTimeout" to execute */)
  }

  /**
   * @FIXME add description
   */
  isReady() {
    return new Promise((resolve) => {
      this._ready
        ? resolve(this._ready)
        : this.once('set-ready', (isReady) => { this._ready = isReady; resolve(this._ready); })
    });
  }

  /**
   * @returns whether plugin is compatible with current projectId
   */
  isCurrentProjectCompatible(projectId) {
    return projectId === ProjectsRegistry.getCurrentProject().getGid();
  }

  /**
   * Check and register plugin only when compatible with current projectId (eg: qdjango:1)
   */
  registerPlugin(projectId) {
    const iscompatible  = this.isCurrentProjectCompatible(projectId);
    if (iscompatible) {
      PluginsRegistry.registerPlugin(this);
    } else {
      ApplicationService.loadedPlugin(this.name, false); // remove loading plugin
      clearTimeout(this._timeout);
    }
    return iscompatible;
  }

  /**
   * @FIXME explain better what it does
   * 
   * Get plugin dependencies 
   */
  getDependencyPlugins(pluginsName) {
    this.dependencies = pluginsName || this.dependencies;
    return Promise.all(this.dependencies.map(pluginName => this.getDependencyPlugin(pluginName)))
  }

  /**
   * @FIXME explain better what it does
   * 
   * Create to not replace above plugin method used by non changed old plugin
   */
  async getDependencyPluginsObject(pluginsName) {
    const api = {};
    const promises = await this.getDependencyPlugins(pluginsName);
    this.dependencies.forEach((pluginName, index) => api[pluginName] = promises[index]);
    return api;
  }

  /**
   * @FIXME explain better what it does
   * 
   * Get plugin dependency
   */
  getDependencyPlugin(pluginName) {
    if (PluginsRegistry.isTherePlugin(pluginName)) {
      return new Promise((resolve) => {
        const plugin = PluginsRegistry.getPlugin(pluginName);
        /**
         * @TODO refactor weird shortcircuiting logic
         */
        plugin
        && plugin.isReady().then(() => resolve(plugin.getApi()))
        || PluginsRegistry.onafter('registerPlugin', plugin => {
          (plugin.name === pluginName) && plugin.isReady().then(() => {resolve(plugin.getApi())})
        });
      })
    }
    return Promise.reject({ error: 'no plugin' });
  }

  /**
   * Handle loading process of a specific hook service (eg. "tools" interface on the left sidebar)
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
          name:     config.name || tool.name,
          html:     tool.html,
          options:  tool.options || {},
          action:   tool.action && tool.action.bind(this, config),
          loading:  undefined !== tool.loading  ? tool.loading  : false,
          disabled: undefined !== tool.disabled ? tool.disabled : false,
          offline:  undefined !== tool.offline  ? tool.offline  : true,
          state:    undefined !== tool.state    ? tool.state    : ({ type: null, message: null })
        };
      });
      this.getHookService(hook).addTools(tools, group);
    }

    return tools;
  }

  /**
   * @FIXME add description
   */
  setToolState({ id, state = { type:null, message: null } } = {}) {
    this.hookservices[this._hook].setToolState({ id, state });
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
   * @param { boolean }          opts.isolate                      whether propagate click event to all sidebar item
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

    const çç = (a, b) => undefined !== a ? a : b; // like a ?? (coalesce operator)

    opts.vueComponentObject = vue; 
    opts.collapsible        = çç(opts.collapsible, true);
    opts.mobile             = çç(opts.mobile, true);
    opts.isolate            = çç(opts.isolate, false);
    opts.sidebarOptions     = çç(opts.sidebarOptions, { position: 1 });

    GUI.addComponent(new Component(opts), 'sidebar', opts.sidebarOptions);

    this.once('unload', () => GUI.removeComponent(opts.id, 'sidebar', opts.sidebarOptions));

    return GUI.getComponent(opts.id) ;
  }

  /**
   * @deprecated since v3.4.
   * 
   * @virtual method need to be implemented by subclasses
   */
  unload() {
    if (this.service) {
      this.service.clearAllEvents();
    }
    this.emit('unload');
  }

  /**
   * @deprecated since v3.4.
   * 
   * @virtual method need to be implemented by subclasses
   */
  load() { }

  /**
   * @TODO it could be depecrated after v3.4 ?
   */
  getProject() {
    return ProjectsRegistry.getCurrentProject();
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
  addFontClasses(fonClasses = []) {
    fonClasses.forEach(fontClass => this.addFontClass(fontClass));
  }

};