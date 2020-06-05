const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const G3WObject = require('core/g3wobject');
const GUI = require('gui/gui');
const ProjectsRegistry = require('core/project/projectsregistry');
const PluginsRegistry = require('./pluginsregistry');

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
  }
};

inherit(Plugin,G3WObject);

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
  api.getConfig = this._api.getConfig;
  this._api = api;
};

proto.setReady = function(bool) {
  this._ready = bool;
  this.emit('set-ready', bool)
};

proto.isReady = function() {
  return new Promise((resolve, reject) => {
    if (this._ready) resolve();
    else
      this.once('set-ready', (bool) => {
        this._ready = bool;
        resolve();
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

proto.setConfig = function(config) {
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
  return iscompatible;
};

proto.setupGui = function() {};

// method to get dependencies plugin
proto.getDependencyPlugins = function(pluginsName) {
  pluginsName = pluginsName || this.dependencies;
  const pluginPromises = pluginsName.map((pluginName) => {
    return this.getDependencyPlugin(pluginName)
  });
  return Promise.all(pluginPromises)
};

// method to get plugin dependency
proto.getDependencyPlugin = function(pluginName) {
  if (!PluginsRegistry.isTherePlugin(pluginName)) return Promise.reject({error:'no plugin'});
  return new Promise((resolve, reject) => {
    const plugin = PluginsRegistry.getPlugin(pluginName);
    plugin && plugin.isReady().then(() => {
          resolve(plugin.getApi())
        })
    || PluginsRegistry.onafter('registerPlugin',(plugin) => {
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
  const tools = configs.map((config) => {
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

// unload (case change map)
proto.unload  = function() {
  this.service && this.service.clearAllEvents();
  //console.log('UNLOAD can be overwrite by plugin');
};

// load plugin
proto.load = function() {
  //console.log('LOAD  need to be overwrite by plugin');
};

module.exports = Plugin;
