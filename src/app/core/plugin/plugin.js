import PluginsRegistry    from 'store/plugins';
import ProjectsRegistry   from 'store/projects';
import ApplicationService from 'services/application';
import GUI                from 'services/gui';
import G3WObject          from 'core/g3wobject';

const { base, inherit, toRawType } = require('core/utils/utils');
const ComponentsFactory            = require('gui/component/componentsfactory');
const { addI18nPlugin }            = require('core/i18n/i18n.service');

const TIMEOUT = 10000;

const Plugin = function({
    name = null,
    config = PluginsRegistry.getPluginConfig(name),
    service = null,
    dependencies = [],
    i18n = null,
    fontClasses = [],
    api = {}
  } = {}) {
  
  base(this);

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
    PluginsRegistry.removeLoadingPlugin(this.name, this._ready);
    this.removeLayout();
  }, TIMEOUT)

};

inherit(Plugin, G3WObject);

const proto = Plugin.prototype;

proto.setName = function(name) {
  this.name = name;
};

proto.getName = function() {
  return this.name;
};

proto.setConfig = function(config) {
  this.config = toRawType(config) === 'Object' ? config : null;
};

proto.getConfig = function(name = this.name) {
  return this.config || PluginsRegistry.getPluginConfig(name);
};

proto.setLocale = function(i18n) {
  if (i18n && this.name) addI18nPlugin({ name: this.name, config: i18n});
};

proto.setService = function(service) {
  this.service = service;
  if (service) service.setPlugin(this);
};

proto.getService = function() {
  return this.service
};

proto.setDependencies = function(dependencies) {
  this.dependencies = dependencies;
};

proto.setApi = function(api = {}) {
  this._api = api;
  /**
   * @FIXME useless assignment ?
   */
  api.getConfig = this._api.getConfig; // add alias for "api.getConfig()" method
};

proto.getApi = function() {
  return this._api;
};

proto.setHookService = function(hook) {
  this._hook = hook;
};

proto.getHookService = function(hook = "tools") {
  return this.hookservices[hook];
};

/**
 * Override plugin's content default layout (eg. default panel width, height, ...)
 * 
 * @see g3wsdk.core.ApplicationState.gui.layout
 */
proto.setLayout = function(config = ApplicationService.cloneLayout('app')) {
  ApplicationService.setLayout(this.name, config);
};

/**
 * @FIXME add description
 * 
 * @see g3wsdk.core.ApplicationState.gui.layout.__current
 */
proto.setCurrentLayout = function() {
  ApplicationService.setCurrentLayout(this.name);
};

/**
 * @FIXME add description
 * 
 * @see g3wsdk.core.ApplicationState.gui.layout
 */
proto.removeLayout = function() {
  ApplicationService.removeLayout(this.name)
};

/**
 * @FIXME add description
 */
proto.setReady = function(isReady) {
  this._ready = isReady;
  if (this._ready) {
    this.setLayout();
  }
  this.emit('set-ready', isReady, this.name);
  /**
   * @FIXME empty delay ?
   */
  setTimeout(() => {
    clearTimeout(this._timeout);
    PluginsRegistry.removeLoadingPlugin(this.name, this._ready);
  }, 0 /* 0 = allow any previously "setTimeout" to execute */)
};

/**
 * @FIXME add description
 */
proto.isReady = function() {
  return new Promise((resolve) => {
    this._ready
      ? resolve(this._ready)
      : this.once('set-ready', (isReady) => { this._ready = isReady; resolve(this._ready); })
  });
};

/**
 * Check if plugin is compatible with current projectId
 */
proto.isCurrentProjectCompatible = function(projectId) {
  return projectId === ProjectsRegistry.getCurrentProject().getGid();
};

/**
 * Check and register plugin only when compatible with current projectId (eg: qdjango:1)
 */
proto.registerPlugin = function(projectId) {
  const iscompatible  = this.isCurrentProjectCompatible(projectId);
  if (iscompatible) {
    PluginsRegistry.registerPlugin(this);
  } else {
    PluginsRegistry.removeLoadingPlugin(this.name, false);
    clearTimeout(this._timeout);
  }
  return iscompatible;
};

/**
 * @FIXME explain better what it does
 * 
 * Get plugin dependencies 
 */
proto.getDependencyPlugins = function(pluginsName) {
  this.dependencies = pluginsName || this.dependencies;
  return Promise.all(this.dependencies.map(pluginName => this.getDependencyPlugin(pluginName)))
};

/**
 * @FIXME explain better what it does
 * 
 * Create to not replace above plugin method used by non changed old plugin
 */
proto.getDependencyPluginsObject = async function(pluginsName) {
  const pluginsApiObject = {};
  const promises = await this.getDependencyPlugins(pluginsName);
  this.dependencies.forEach((pluginName, index) => pluginsApiObject[pluginName] = promises[index]);
  return pluginsApiObject
};

/**
 * @FIXME explain better what it does
 * 
 * Get plugin dependency
 */
proto.getDependencyPlugin = function(pluginName) {
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
};

/**
 * Handle loading process of a specific hook service (eg. "tools" interface on the left sidebar)
 */
proto.setHookLoading = function({ hook = "tools", loading = false } = {}) {
  this.getHookService(hook).setLoading(loading);
};

/**
 * @FIXME add description
 */
proto.addToolGroup = function({ hook = "tools", position:order, title:group } = {}) {
  this.getHookService(hook).addToolGroup(order, group);
};

/**
 * @FIXME add description
 */
proto.removeToolGroup = function({ hook, group } = {}) {
  this.getHookService(hook).removeToolGroup(group.title);
};

/**
 * @FIXME add description
 */
proto.addTools = function(
  {
    hook = "tools",
    action,
    html,
    offline = true,
    icon,
    name,
    type,
    options = {},
    loading = false,
    disabled = false,
    state = {
      type:null,
      message:null
    }
  } = {},
  groupTools
  ) {
  if (!action && !type) {
    this.removeToolGroup({ hook, group: groupTools });
    return [];
  } else {
    this.setHookService(hook);
    const tools = (this.config.configs || [this.config]).map(config => {
        return {
        icon,
        type,
        name: config.name || name,
        html,
        loading,
        disabled,
        options,
        offline,
        action: action && action.bind(this, config),
        state
      };
    });
    this.getHookService(hook).addTools(tools, groupTools);
    return tools;
  }
};

/**
 * @FIXME add description
 */
proto.setToolState = function({ id, state = { type:null, message: null } } = {}) {
  this.hookservices[this._hook].setToolState({ id, state });
};

/**
 * @FIXME add description
 */
proto.removeTools = function() {
  this.hookservices[this._hook].removeTools();
};

/**
 * Helper method to create and add a custom component item on the left sidebar
 */
proto.createSideBarComponent = function(
  vueComponentObject,                    // vue single file component (SFC)
  options = {
    id,
    title,                               // textual description on left sidebar (eg. "metadata")
    open = false,                        // true = collapsible button; false = button
    collapsible = true,                  // if (collapsible) expand the button when plugin is loaded
    mobile = true,                         
    isolate = false,                     // true = click event doesn't propagate to all sidebar item
    closewhenshowviewportcontent = true,
    iconConfig = {
      // color: 'yellow',                // color of icon
      // icon:'pin',                     // see gui\vue\vueappplugin.js font list
    },
    events = {
      // open: {
      //   when: 'before',
      //   cb:() => { /* TODO: add sample usage */ }
      // }
    },
    sidebarOptions = {
      position: 1                        // can be a number or a string 
    }
  } = {}) {

  const componentsFactoryOpts = {
    ...options,
    iconColor: options.iconConfig.color,
    icon: GUI.getFontClass(options.iconConfig.icon),
  };

  delete componentsFactoryOpts.iconConfig;

  const PluginSiderbarComponent = ComponentsFactory.build({ vueComponentObject }, componentsFactoryOpts);
  GUI.addComponent(PluginSiderbarComponent, 'sidebar', options.sidebarOptions);
  this.once('unload', () => GUI.removeComponent(id, 'sidebar', options.sidebarOptions));
  return PluginSiderbarComponent;
};

/**
 * @deprecated since v3.4.
 */
proto.unload  = function() {
  this.service && this.service.clearAllEvents();
  this.emit('unload');
  //console.log('UNLOAD can be overwrite by plugin');
};

/**
 * @deprecated since v3.4.
 */
proto.load = function() {
  //console.log('LOAD  need to be overwrite by plugin');
};

/**
 * @TODO it could be depecrated after v3.4 ?
 */
proto.getProject = function() {
  return ProjectsRegistry.getCurrentProject();
};

/**
 * @TODO it could be depecrated after v3.4 ?
 */
proto.addDependency = function(dependency) {
  this.dependencies.push(dependency);
};

/**
 * @TODO it could be depecrated after v3.4 ?
 */
proto.addFontClass = function({ name, className }) {
  Vue.prototype.g3wtemplate.addFontClass({ name, className });
};

/**
 * @TODO it could be depecrated after v3.4 ?
 */
proto.addFontClasses = function(fonClasses = []) {
  fonClasses.forEach(fontClass => this.addFontClass(fontClass));
};

module.exports = Plugin;
