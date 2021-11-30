const {base, inherit} = require('core/utils/utils');
const G3WObject = require('core/g3wobject');
const GUI = require('gui/gui');
const ComponentsFactory = require('gui/componentsfactory');
const ProjectsRegistry = require('core/project/projectsregistry');
const PluginsRegistry = require('./pluginsregistry');
const TIMEOUT = 10000;

const Plugin = function() {
  base(this);
  this.name = '(no name)';
  this.config = null;
  this.service = null;
  this.dependencies = [];
  this._api = {
    getConfig: () => this.config
  };
  this._hook = null;
  this._ready = false;
  this._services = {
    'search': GUI.getComponent('search').getService(),
    'tools': GUI.getComponent('tools').getService()
  };
  // timeout to remove loading plugin after timeout
  this._timeout = setTimeout(()=>{
    PluginsRegistry.removeLoadingPlugin(this.name, this._ready);
  }, TIMEOUT)
};

inherit(Plugin, G3WObject);

const proto = Plugin.prototype;

proto.setDependencies = function(dependencies) {
  this.dependencies = dependencies;
};

proto.addDependency = function(dependency) {
  this.dependencies.push(dependency);
};

//API Plugin
proto.getApi = function() {
  return this._api;
};

proto.setApi = function(api={}) {
  //add a common method to get plufin configuration
  api.getConfig = this._api.getConfig;
  this._api = api;
};

proto.setReady = function(bool) {
  this._ready = bool;
  this.emit('set-ready', bool, this.name);
  setTimeout(()=>{
    clearTimeout(this._timeout);
    PluginsRegistry.removeLoadingPlugin(this.name, this._ready);
  }, )
};

proto.isReady = function() {
  return new Promise((resolve, reject) => {
    if (this._ready) resolve(this._ready);
    else
      this.once('set-ready', (bool, name) => {
        this._ready = bool;
        resolve(this._ready);
      })
  })
};

//return plugin service
proto.getService = function() {
  return this.service
};

//set plugin service
proto.setService = function(service) {
  this.service = service;
  service.setPlugin(this);
};

proto.getName = function() {
  return this.name;
};

proto.setName = function(name) {
  this.name = name;
};

//get cplugin configuration
proto.getConfig = function(name) {
  name = name || this.name;
  return PluginsRegistry.getPluginConfig(name);
};

proto.setConfig = function(config={}) {
  this.config = config;
};

//check if plugin is compatible with current project
proto.isCurrentProjectCompatible = function(projectId) {
  const project = ProjectsRegistry.getCurrentProject();
  return projectId === project.getGid();
};

proto.getProject = function() {
  return ProjectsRegistry.getCurrentProject();
};

//register the plugin if compatible
proto.registerPlugin = function(projectId) {
  const iscompatible = this.isCurrentProjectCompatible(projectId);
  iscompatible && PluginsRegistry.registerPlugin(this);
  // if is incompatible
  if (!iscompatible) {
    PluginsRegistry.removeLoadingPlugin(this.name, false);
    clearTimeout(this._timeout);
  }
  return iscompatible;
};

proto.setupGui = function() {};

//proto.getDependencyPluginsObject

// method to get dependencies plugin
proto.getDependencyPlugins = function(pluginsName) {
  this.dependencies = pluginsName || this.dependencies;
  const pluginPromises = this.dependencies.map(pluginName => this.getDependencyPlugin(pluginName));
  return Promise.all(pluginPromises)
};

// create to not replace above plugin method used by non changed old  plugin
proto.getDependencyPluginsObject = async function(pluginsName){
  const pluginsApiObject = {};
  const promises = await this.getDependencyPlugins(pluginsName);
  this.dependencies.forEach((pluginName, index) => pluginsApiObject[pluginName] = promises[index]);
  return pluginsApiObject
};

// method to get plugin dependency
proto.getDependencyPlugin = function(pluginName) {
  if (!PluginsRegistry.isTherePlugin(pluginName)) return Promise.reject({error:'no plugin'});
  return new Promise((resolve, reject) => {
    const plugin = PluginsRegistry.getPlugin(pluginName);
    plugin && plugin.isReady().then(() => resolve(plugin.getApi()))
    || PluginsRegistry.onafter('registerPlugin',plugin => {
        (plugin.name === pluginName) && plugin.isReady().then(() => {resolve(plugin.getApi())})
      });
  })
};

proto.setHookLoading = function({hook="tools", loading=false} = {}) {
  const service = this._services[hook];
  service.setLoading(loading);
};

proto.getHookService = function(hook="tools") {
  return this._services[hook];
};

proto.addToolGroup = function({hook="tools", position:order, title:group} = {}) {
  const service = this.getHookService(hook);
  service.addToolGroup(order, group);
};

proto.removeToolGroup = function({hook, group}={}){
  const {title} = group;
  const service = this.getHookService(hook);
  service.removeToolGroup(title);
};

proto.addTools = function({hook="tools", action, html, offline=true, icon, name, type, options={}, loading=false, disabled=false, state={type:null, message:null}} = {}, groupTools) {
  if (!action && !type) {
    this.removeToolGroup({hook, group:groupTools});
    return [];
  }
  this._hook = hook;
  const service = this._services[hook];
  const configs = this.config.configs || [this.config];
  const tools = configs.map(config => {
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
    }
  });
  service.addTools(tools, groupTools);
  return tools;
};

proto.setToolState = function({id, state={type:null, message: null}}={}){
  const service = this._services[this._hook];
  service.setToolState({id, state});
};

proto.removeTools = function() {
  const service = this._services[this._hook];
  service.removeTools();
};

/**
 * Method to create sibebar item component
 */
proto.createSideBarComponent = function(vueComponentObject, options={}){
  const {
    id,
    title,
    open=false,
    collapsible= true,
    mobile=true,
    isolate=false,
    closewhenshowviewportcontent=true,
    iconConfig={},
    events={},
    sidebarOptions={position:1}
  } = options;

  const PluginSiderbarComponent = ComponentsFactory.build(
    {
      vueComponentObject
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
      events
    });
  GUI.addComponent(PluginSiderbarComponent, 'sidebar', sidebarOptions);
  this.once('unload', () => GUI.removeComponent(id, 'sidebar', sidebarOptions));
  return PluginSiderbarComponent;
};

// unload (case change map)
proto.unload  = function() {
  this.service && this.service.clearAllEvents();
  this.emit('unload');
  //console.log('UNLOAD can be overwrite by plugin');
};

// load plugin
proto.load = function() {
  //console.log('LOAD  need to be overwrite by plugin');
};

module.exports = Plugin;
