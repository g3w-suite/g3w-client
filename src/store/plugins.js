/**
 * ORIGINAL SOURCE: src/app/core/plugin/pluginsregistry.js@v3.4
 */
import ProjectsRegistry from 'store/projects';
import ApplicationService from 'services/application';

const { base, inherit } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');

/**
 * law project configuration on project is handle as plugin
 * @type {string[]}
 */
const OTHERPLUGINS = ['law'];

function PluginsRegistry() {
  this.config = null;
  this._plugins = {};
  this._configurationPlugins = [];
  this.pluginsConfigs = {};
  this._loadedPluginUrls = [];
  this.setters = {
    //setters to register plugin
    registerPlugin(plugin) {
      if (!this._plugins[plugin.name]) this._plugins[plugin.name] = plugin;
    }
  };
  /**
   * CHECK IF STILL USEFUL. IT RELATED TO CHANGE MAP OLD BEHAVIOR (PREVIOUS VERSION 3.4).
   * NOW WHEN CHANGE MAP IS TRIGGER, PAGE IS RELOADED.
   */
  ProjectsRegistry.onafter('setCurrentProject', project =>{
    this.gidProject = project.getGid();
  });

  base(this);

  // initialize plugin
  this.init = function(options={}) {
    return new Promise(async (resolve, reject) =>{
      this.pluginsBaseUrl = options.pluginsBaseUrl;
      // plugin configurations
      this.setPluginsConfig(options.pluginsConfigs);
      // filter
      Object.keys(this.pluginsConfigs).forEach(pluginName => this._configurationPlugins.push(pluginName));
      this.addLoadingPlugins();
      // plugins that aren't in configuration server but in project
      this.otherPluginsConfig = options.otherPluginsConfig;
      this.setOtherPlugins();
      this.setDependencyPluginConfig();
      try {
        const plugins = await this._loadPlugins();
        resolve(plugins);
      } catch(error){
        reject(error);
      }
    })
  };

  this.addLoadingPlugins = function(){
    Object.keys(this.pluginsConfigs).forEach(plugin => ApplicationService.loadingPlugin(plugin));
  };

  this.removeLoadingPlugin = function(plugin, ready){
    ApplicationService.loadedPlugin(plugin, ready);
  };

  this._loadPlugins = function() {
    const pluginLoadPromises = Object.entries(this.pluginsConfigs).map(([name, pluginConfig]) => this._setup(name, pluginConfig));
    return Promise.allSettled(pluginLoadPromises)
  };

  this.setDependencyPluginConfig = function(){
    for (const pluginName in this.pluginsConfigs){
      const dependecyPluginConfig = this.pluginsConfigs[pluginName].plugins;
      dependecyPluginConfig && Object.keys(dependecyPluginConfig).forEach(pluginName => {
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
    return new Promise(async (resolve, reject) => {
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
      this.addLoadingPlugins();
      this.setOtherPlugins();
      try {
        const plugins = await this._loadPlugins();
        resolve(plugins);
      } catch(error){
        reject(error)
      }
    })
  };

  /**
   * setup plugin config only filtered by gid configuration
   * @param config
   */
  this.setPluginsConfig = function(config={}) {
    const enabledPluginConfig = {};
    Object.entries(config)
      .filter(([,pluginConfig]) => pluginConfig.gid === this.gidProject)
      .forEach(([pluginName, pluginConfig]) =>enabledPluginConfig[pluginName] = pluginConfig);
    this.pluginsConfigs = enabledPluginConfig;
  };

  /**
   * Method to load external script
   * @param url
   * @returns {*}
   * @private
   */
  this._loadScript = function(url) {
    return $.getScript(url);
  };

  //load plugin script
  this._setup = function(name, pluginConfig) {
    return new Promise(async (resolve, reject) => {
      if (!_.isNull(pluginConfig)) {
        const {jsscripts=[]} = pluginConfig;
        const depedencypluginlibrariespromises = [];
        for (const script of jsscripts) {
          depedencypluginlibrariespromises.push(new Promise((resolve, reject) => {
            this._loadScript(script)
              .done(() => resolve())
              .fail(() => reject())
          }));
        }
        try {
          await Promise.all(depedencypluginlibrariespromises);
          const baseUrl = `${this.pluginsBaseUrl}${name}`;
          const scriptUrl = `${baseUrl}/js/plugin.js?${Date.now()}`;
          pluginConfig.baseUrl= this.pluginsBaseUrl;
          this._loadScript(scriptUrl)
            .done(() => {
              this._loadedPluginUrls.push(scriptUrl);
              resolve();
            })
            .fail(()=>{
              this.removeLoadingPlugin(name, false);
              reject();
            })
        } catch(err){
          this.removeLoadingPlugin(name, false);
          reject();
        }
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

  // method to check if a plugin is in configuration and will be added to application
  this.isPluginInConfiguration = function(pluginName){
    return this._configurationPlugins.indexOf(pluginName) !== -1;
  };

  this.isTherePlugin = function(pluginName){
    return this.pluginsConfigs[pluginName];
  }
}

inherit(PluginsRegistry, G3WObject);

export default new PluginsRegistry();
