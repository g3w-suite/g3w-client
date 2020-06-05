const base = require('core/utils/utils').base;
const inherit = require('core/utils/utils').inherit;
const G3WObject = require('core/g3wobject');
const OTHERPLUGINS = ['law'];

function PluginsRegistry() {
  this.config = null;
  this._plugins = {};
  this.pluginsConfigs = {};
  this._loadedPluginUrls = [];
  this.setters = {
    //setters to register plugin
    registerPlugin(plugin) {
      if (!this._plugins[plugin.name]) this._plugins[plugin.name] = plugin;
    }
  };
  base(this);

  // initilize plugin
  this.init = function(options={}) {
    this.pluginsBaseUrl = options.pluginsBaseUrl;
    // plugin configurations
    this.pluginsConfigs = options.pluginsConfigs;
    // plugins that aren't in configuration server but in project
    this.otherPluginsConfig = options.otherPluginsConfig;
    this.setOtherPlugins();
    this.setDependencyPluginConfig();
    return this._loadPlugins();
  };

  this._loadPlugins = function() {
    const pluginLoadPromises = Object.entries(this.pluginsConfigs).map(([name, pluginConfig]) => {
      return this._setup(name, pluginConfig);
    });
    return Promise.all(pluginLoadPromises)
  };

  this.setDependencyPluginConfig = function(){
    for (pluginName in this.pluginsConfigs){
      const dependecyPluginConfig = this.pluginsConfigs[pluginName].plugins;
      dependecyPluginConfig && Object.keys(dependecyPluginConfig).forEach((pluginName) =>{
        this.pluginsConfigs[pluginName] = {...this.pluginsConfigs[pluginName], ...dependecyPluginConfig[pluginName]}
      })
    }
  };

  this.setOtherPlugins = function() {
    const law = OTHERPLUGINS[0];
    if (this.otherPluginsConfig && this.otherPluginsConfig[law] && this.otherPluginsConfig[law].length) {
      // law plugin
      this.pluginsConfigs[law] = this.otherPluginsConfig[law];
      this.pluginsConfigs[law].gid = this.otherPluginsConfig.gid;
    } else delete this.pluginsConfigs[law];
  };

  // reaload plugin in case of change map
  this.reloadPlugins = function(initConfig, project) {
    const scripts = $('script');
    const plugins = this.getPlugins();
    for (const pluginName in plugins) {
      const plugin = plugins[pluginName];
      // unload plugin e remove from DOM
      plugin.unload();
      delete this._plugins[pluginName];
      scripts.each((index, scr) => {
        this._loadedPluginUrls.forEach((pluginUrl, idx) => {
          if (scr.getAttribute('src') === pluginUrl && pluginUrl.indexOf(pluginName) !== -1) {
            scr.parentNode.removeChild( scr );
            this._loadedPluginUrls.splice(idx, 1);
            return false;
          }})
      });
    }
    this._loadedPluginUrls = [];
    //setup plugins
    this.otherPluginsConfig = project.getState();
    this.setPluginsConfig(initConfig.group.plugins);
    this.setOtherPlugins();
    return this._loadPlugins();
  };

  this.setPluginsConfig = function(config) {
    this.pluginsConfigs = config;
  };

  this._loadScript = function(url, name) {
    return $script(url, name);
  };

  //load plugin script
  this._setup = function(name, pluginConfig) {
    return new Promise((resolve, reject) => {
      if (!_.isNull(pluginConfig)) {
        const baseUrl = this.pluginsBaseUrl+name;
        const scriptUrl = baseUrl + '/js/plugin.js?'+Date.now();
        pluginConfig.baseUrl= this.pluginsBaseUrl;
        this._loadScript(scriptUrl, name)
          .ready(name, () => {
            this._loadedPluginUrls.push(scriptUrl);
            resolve()
          })
      } else resolve()
    })

  };

  this.getPluginConfig = function(pluginName) {
    return this.pluginsConfigs[pluginName];
  };

  this.getPlugins = function() {
    return this._plugins;
  };

  this.getPlugin = function(pluginName) {
    return this._plugins[pluginName];
  };

  this.isTherePlugin = function(pluginName){
    return this.pluginsConfigs[pluginName];
  }
}

inherit(PluginsRegistry,G3WObject);

module.exports = new PluginsRegistry;
