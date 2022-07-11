import ApplicationService from 'core/applicationservice';
import G3WObject from 'core/g3wobject';
import GUI from 'gui/gui';
import ComponentsFactory from 'gui/component/componentsfactory';
import ProjectsRegistry from 'core/project/projectsregistry';
import PluginsRegistry from './pluginsregistry';

const TIMEOUT = 10000;

class Plugin extends G3WObject {
  constructor() {
    super();
    this.name = '(no name)';
    this.config = null;
    this.service = null;
    this.dependencies = [];
    this._api = {
      getConfig: () => this.config,
    };
    this._hook = null;
    this._ready = false;
    this._services = {
      search: GUI.getService('search'),
      tools: GUI.getService('tools'),
    };
    // timeout to remove loading plugin after timeout
    this._timeout = setTimeout(() => {
      PluginsRegistry.removeLoadingPlugin(this.name, this._ready);
      this.removeLayout();
    }, TIMEOUT);
  }

  /**
   * Handle layout plugin
   */

  setLayout(config = ApplicationService.cloneLayout('app')) {
    ApplicationService.setLayout(this.name, config);
  }

  setCurrentLayout() {
    ApplicationService.setCurrentLayout(this.name);
  }

  removeLayout() {
    ApplicationService.removeLayout(this.name);
  }

  /** *
   * End layout plugin
   */

  setDependencies(dependencies) {
    this.dependencies = dependencies;
  }

  addDependency(dependency) {
    this.dependencies.push(dependency);
  }

  // API Plugin
  getApi() {
    return this._api;
  }

  setApi(api = {}) {
    // add a common method to get plufin configuration
    api.getConfig = this._api.getConfig;
    this._api = api;
  }

  setReady(bool) {
    this._ready = bool;
    bool && this.setLayout();
    this.fire('set-ready', bool, this.name);
    setTimeout(() => {
      clearTimeout(this._timeout);
      PluginsRegistry.removeLoadingPlugin(this.name, this._ready);
    });
  }

  isReady() {
    return new Promise((resolve, reject) => {
      if (this._ready) resolve(this._ready);
      else {
        this.once('set-ready', (bool, name) => {
          this._ready = bool;
          resolve(this._ready);
        });
      }
    });
  }

  // return plugin service
  getService() {
    return this.service;
  }

  // set plugin service
  setService(service) {
    this.service = service;
    service.setPlugin(this);
  }

  getName() {
    return this.name;
  }

  setName(name) {
    this.name = name;
  }

  // get cplugin configuration
  getConfig(name = this.name) {
    return PluginsRegistry.getPluginConfig(name);
  }

  setConfig(config = {}) {
    this.config = config;
  }

  // check if plugin is compatible with current project
  isCurrentProjectCompatible(projectId) {
    const project = ProjectsRegistry.getCurrentProject();
    return projectId === project.getGid();
  }

  getProject() {
    return ProjectsRegistry.getCurrentProject();
  }

  // register the plugin if compatible
  registerPlugin(projectId) {
    const iscompatible = this.isCurrentProjectCompatible(projectId);
    iscompatible && PluginsRegistry.registerPlugin(this);
    // if is incompatible
    if (!iscompatible) {
      PluginsRegistry.removeLoadingPlugin(this.name, false);
      clearTimeout(this._timeout);
    }
    return iscompatible;
  }

  setupGui() {}

  // method to get dependencies plugin
  getDependencyPlugins(pluginsName) {
    this.dependencies = pluginsName || this.dependencies;
    const pluginPromises = this.dependencies.map((pluginName) => this.getDependencyPlugin(pluginName));
    return Promise.all(pluginPromises);
  }

  // create to not replace above plugin method used by non changed old  plugin
  async getDependencyPluginsObject(pluginsName) {
    const pluginsApiObject = {};
    const promises = await this.getDependencyPlugins(pluginsName);
    this.dependencies.forEach((pluginName, index) => pluginsApiObject[pluginName] = promises[index]);
    return pluginsApiObject;
  }

  // method to get plugin dependency
  getDependencyPlugin(pluginName) {
    if (!PluginsRegistry.isTherePlugin(pluginName)) return Promise.reject({ error: 'no plugin' });
    return new Promise((resolve, reject) => {
      const plugin = PluginsRegistry.getPlugin(pluginName);
      plugin && plugin.isReady().then(() => resolve(plugin.getApi()))
      || PluginsRegistry.onafter('registerPlugin', (plugin) => {
        (plugin.name === pluginName) && plugin.isReady().then(() => { resolve(plugin.getApi()); });
      });
    });
  }

  /**
   * Method to start loading process of a specific hook service (for example tool loading interface on sidebar)
   * @param hook
   * @param loading
   */
  setHookLoading({ hook = 'tools', loading = false } = {}) {
    const service = this._services[hook];
    service.setLoading(loading);
  }

  getHookService(hook = 'tools') {
    return this._services[hook];
  }

  addToolGroup({ hook = 'tools', position: order, title: group } = {}) {
    const service = this.getHookService(hook);
    service.addToolGroup(order, group);
  }

  removeToolGroup({ hook, group } = {}) {
    const { title } = group;
    const service = this.getHookService(hook);
    service.removeToolGroup(title);
  }

  addTools({
    hook = 'tools', action, html, offline = true, icon, name, type, options = {}, loading = false, disabled = false, state = { type: null, message: null },
  } = {}, groupTools) {
    if (!action && !type) {
      this.removeToolGroup({ hook, group: groupTools });
      return [];
    }
    this._hook = hook;
    const service = this._services[hook];
    const configs = this.config.configs || [this.config];
    const tools = configs.map((config) => ({
      icon,
      type,
      name: config.name || name,
      html,
      loading,
      disabled,
      options,
      offline,
      action: action && action.bind(this, config),
      state,
    }));
    service.addTools(tools, groupTools);
    return tools;
  }

  setToolState({ id, state = { type: null, message: null } } = {}) {
    const service = this._services[this._hook];
    service.setToolState({ id, state });
  }

  removeTools() {
    const service = this._services[this._hook];
    service.removeTools();
  }

  /**
   * Method to create sibebar item component
   */
  createSideBarComponent(vueComponentObject, options = {}) {
    const {
      id,
      title,
      open = false,
      collapsible = true,
      mobile = true,
      isolate = false,
      closewhenshowviewportcontent = true,
      iconConfig = {},
      events = {},
      sidebarOptions = { position: 1 },
    } = options;

    const PluginSiderbarComponent = ComponentsFactory.build(
      {
        vueComponentObject,
      },
      {
        id,
        title,
        open,
        collapsible,
        isolate,
        iconColor: iconConfig.color && iconConfig.color,
        icon: iconConfig.icon && GUI.getFontClass(iconConfig.icon),
        mobile,
        closewhenshowviewportcontent,
        events,
      },
    );
    GUI.addComponent(PluginSiderbarComponent, 'sidebar', sidebarOptions);
    this.once('unload', () => GUI.removeComponent(id, 'sidebar', sidebarOptions));
    return PluginSiderbarComponent;
  }

  // unload (case change map)
  unload() {
    this.service && this.service.clearAllEvents();
    this.fire('unload');
    // console.log('UNLOAD can be overwrite by plugin';
  }

  // load plugin
  load() {
    // console.log('LOAD  need to be overwrite by plugin';
  }

  addFontClass({ name, className }) {
    Vue.prototype.g3wtemplate.addFontClass({
      name,
      className,
    });
  }

  addFontClasses(fonClasses = []) {
    fonClasses.forEach((fontClass) => this.addFontClass(fontClass));
  }
}

export default Plugin;
