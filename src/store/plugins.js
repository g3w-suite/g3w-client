/**
 * @file Store G3W-CLIENT plugins (editing, qplotly, qtimeseries, ...)
 * @since v3.6
 */

import ProjectsRegistry from 'store/projects';
import ApplicationService from 'services/application';

const { base, inherit } = require('utils');
const G3WObject = require('core/g3wobject');

/**
 * 'law' project configuration on project is handle as plugin
 *
 * @type {string[]}
 */
const OTHERPLUGINS = ['law'];

function PluginsRegistry() {

  this.config = null;

  /**
   * Object where store plugin
   *   key   = plugin name
   *   value = plugin instance
   */
  this._plugins = {};

  /**
   * Name array of initConfig.group.plugins names
   */
  this._configurationPlugins = [];

  /**
   * Store initConfig.group.plugins object configuration
   */
  this.pluginsConfigs = {};

  /**
   * Store array of plugin loaded url
   */
  this._loadedPluginUrls = [];

  this.setters = {

    /**
     * Setter method to register plugin (called by every plugin when all is ready)
     */
    registerPlugin(plugin) {
      // store plugin into registry (if not already registered )
      if (!this._plugins[plugin.name]) {
        this._plugins[plugin.name] = plugin;
      }
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
  //call by applications.js services folder
  /**
   * 
   * @param { Object } options
   * @param options.pluginsBaseUrl     plugin loading urls
   * @param options.pluginsConfigs     plugin configurations
   * @param options.otherPluginsConfig plugins that aren't in configuration server but in project
   */
  this.init = async function(options = {}) {
    this.pluginsBaseUrl = options.pluginsBaseUrl; 
    this.setPluginsConfig(options.pluginsConfigs);
    Object.keys(this.pluginsConfigs).forEach(name => this._configurationPlugins.push(name)); // filter
    this.addLoadingPlugins();
    this.otherPluginsConfig = options.otherPluginsConfig; 
    this.setOtherPlugins();                                                                  // set other plugin on in initConfig.group.plugins (law for example)
    this.setDependencyPluginConfig();
    const plugins = await this._loadPlugins();                                               // load plugins
    return Promise.resolve(plugins);
  };

  /**
   * Set loading plugins adding them to `ApplicationService`,
   * based on server configuration: `initConfig.group.plugins`
   * 
   */
  this.addLoadingPlugins = function() {
    Object.keys(this.pluginsConfigs).forEach(plugin => ApplicationService.loadingPlugin(plugin));
  };

  /**
   * @param plugin
   * @param ready //TODO used ???
   */
  this.removeLoadingPlugin = function(plugin, ready) {
    ApplicationService.loadedPlugin(plugin, ready);
  };

  /**
   * @returns {Promise<{-readonly [P in keyof Promise<unknown>[]]: PromiseSettledResult<Awaited<Promise<unknown>[][P]>>}>}
   *
   * @private
   */
  this._loadPlugins = function() {
    return Promise.allSettled(Object.entries(this.pluginsConfigs).map(([name, pluginConfig]) => this._setup(name, pluginConfig)));
  };

  /**
   *@TODO need to check if used
   */
  this.setDependencyPluginConfig = function() {
    for (const pluginName in this.pluginsConfigs) {
      const dependecyPluginConfig = this.pluginsConfigs[pluginName].plugins;
      if (dependecyPluginConfig) {
        Object
          .keys(dependecyPluginConfig)
          .forEach(pluginName => {
            this.pluginsConfigs[pluginName] = {
              ...this.pluginsConfigs[pluginName],
              ...dependecyPluginConfig[pluginName]
            }
          })
      }
    }
  };

  /**
   * Method to set other plugin
   */
  this.setOtherPlugins = function() {
    const law = OTHERPLUGINS[0];
    if (this.otherPluginsConfig && this.otherPluginsConfig[law] && this.otherPluginsConfig[law].length) {
      // law plugin
      this.pluginsConfigs[law] = this.otherPluginsConfig[law];
      this.pluginsConfigs[law].gid = this.otherPluginsConfig.gid;
    } else {
      delete this.pluginsConfigs[law];
    }
  };

  /**
   * Reaload plugin in case of change map
   *
   * @deprecated since 3.7
   *
   * @param initConfig
   * @param project
   *
   * @returns { Promise<unknown> }
   */
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
          this._loadedPluginUrls
            .forEach((pluginUrl, idx) => {
              if (scr.getAttribute('src') === pluginUrl && pluginUrl.indexOf(pluginName) !== -1) {
                scr.parentNode.removeChild( scr );
                this._loadedPluginUrls.splice(idx, 1);
                return false;
              }
            })
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
      } catch(error) {
        reject(error);
      }
    })
  };

  /**
   * Set plugin config only filtered by gid configuration
   *
   * @param config
   */
  this.setPluginsConfig = function(config={}) {
    const enabledPluginConfig = {};
    Object.entries(config)
      .filter(([,pluginConfig]) => pluginConfig.gid === this.gidProject)
      .forEach(([pluginName, pluginConfig]) => enabledPluginConfig[pluginName] = pluginConfig);
    this.pluginsConfigs = enabledPluginConfig;
  };

  /**
   * Method to load external script
   *
   * @param url
   * @param { boolean } legacy since 3.10.0 - whether fallback to jquery promises
   *
   * @returns {*}
   *
   * @private
   */
  this._loadScript = function(url, legacy=true) {
    if (legacy) {
      return $.getScript(url);
    }
    return new Promise(function(resolve, reject) {
      const s = document.createElement('script');
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load script: ' + url));
      s.src = url;
      document.head.appendChild(s);
    });
  };

  /**
   * Load/Setup plugin script
   *
   * @param name
   * @param pluginConfig
   *
   * @returns { Promise<void> }
   *
   * @private
   */
  this._setup = async function(name, pluginConfig) {
    if (!pluginConfig) {
      return Promise.resolve();
    }
    // create script url
    const scriptUrl      = `${this.pluginsBaseUrl}${name}/js/plugin.js?${Date.now()}`;
    pluginConfig.baseUrl = this.pluginsBaseUrl;
    try {
      // wait plugin dependencies before load plugin and then add url to loaded plugin urls
      await Promise.all((pluginConfig.jsscripts || []).map(script => this._loadScript(script, false)));
      await this._loadScript(scriptUrl, false);
      this._loadedPluginUrls.push(scriptUrl);
      return Promise.resolve();
    } catch(err) {
      console.warn('[G3W-PLUGIN]', err);
      //remove plugin in case of error of dependencies
      this.removeLoadingPlugin(name, false);
      return Promise.reject();
    }
  };

  /**
   * @param pluginName
   *
   * @returns <Object> Plugin configuration server object
   */
  this.getPluginConfig = function(pluginName) {
    return this.pluginsConfigs[pluginName];
  };

  /**
   * @returns <Object> key pluginName, value plugin instance
   */
  this.getPlugins = function() {
    return this._plugins;
  };

  /**
   * @param pluginName
   *
   * @returns Plugin instance
   */
  this.getPlugin = function(pluginName) {
    return this._plugins[pluginName];
  };

  /**
   * Check if a plugin is in configuration and will be added to application
   *
   * @param pluginName
   *
   * @returns { boolean }
   */
  this.isPluginInConfiguration = function(pluginName) {
    return this._configurationPlugins.indexOf(pluginName) !== -1;
  };

  /**
   * @param pluginName
   *
   * @returns plugin Configuration
   */
  this.isTherePlugin = function(pluginName) {
    return this.pluginsConfigs[pluginName];
  }
}

inherit(PluginsRegistry, G3WObject);

export default new PluginsRegistry();
