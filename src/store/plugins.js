/**
 * @file Store G3W-CLIENT plugins (editing, qplotly, qtimeseries, ...)
 * @since v3.6
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
  //Object where store plugin
  //key plugin name
  //value plugin object
  this._plugins = {};
  //Name array of initConfig.group.plugins names
  this._configurationPlugins = [];
  //Store initConfig.group.plugins object configuration
  this.pluginsConfigs = {};
  //store array of plugin loaded url
  this._loadedPluginUrls = [];
  this.setters = {
    //setters to register plugin
    //call by every plugin when all is ready
    registerPlugin(plugin) {
      //if not registered add plugin
      //key name of plugin
      //value plugin object
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
  this.init = function(options={}) {
    return new Promise(async (resolve, reject) =>{
      //get plugin loading urls
      this.pluginsBaseUrl = options.pluginsBaseUrl;
      // plugin configurations
      this.setPluginsConfig(options.pluginsConfigs);
      // filter
      Object.keys(this.pluginsConfigs)
        .forEach(pluginName => this._configurationPlugins.push(pluginName));
      this.addLoadingPlugins();
      // plugins that aren't in configuration server but in project
      this.otherPluginsConfig = options.otherPluginsConfig;
      //set other plugin on in initConfig.group.plugins
      // law for example
      this.setOtherPlugins();
      this.setDependencyPluginConfig();
      try {
        const plugins = await this._loadPlugins();
        resolve(plugins);
      } catch(error) {
        reject(error);
      }
    })
  };

  /**
   * Based on server configuration plugins initConfig.group.plugins
   * set loading plugin
   */
  this.addLoadingPlugins = function() {
    //add to Application service plugin that need to be load
    Object
      .keys(this.pluginsConfigs)
      .forEach(plugin => ApplicationService.loadingPlugin(plugin));
  };

  /**
   *
   * @param plugin
   * @param ready //TODO used ???
   */
  this.removeLoadingPlugin = function(plugin, ready) {
    ApplicationService.loadedPlugin(plugin, ready);
  };

  /**
   *
   * @returns {Promise<{-readonly [P in keyof Promise<unknown>[]]: PromiseSettledResult<Awaited<Promise<unknown>[][P]>>}>}
   * @private
   */
  this._loadPlugins = function() {
    const pluginLoadPromises = Object
      .entries(this.pluginsConfigs)
        .map(([name, pluginConfig]) => this._setup(name, pluginConfig));

    return Promise.allSettled(pluginLoadPromises)
  };

  /**
   *
   */
  this.setDependencyPluginConfig = function() {
    for (const pluginName in this.pluginsConfigs){
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
   * reaload plugin in case of change map
   * @deprecated since 3.7
   * @param initConfig
   * @param project
   * @returns {Promise<unknown>}
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
        reject(error)
      }
    })
  };

  /**
   * Set plugin config only filtered by gid configuration
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

  /**
   * Load/Setup plugin script
   * @param name
   * @param pluginConfig
   * @returns {Promise<unknown>}
   * @private
   */
  this._setup = function(name, pluginConfig) {
    return new Promise(async (resolve, reject) => {
      if (!_.isNull(pluginConfig)) {
        const {jsscripts=[]} = pluginConfig;
        //Array contains plugin dependencies
        const depedencypluginlibrariespromises = [];
        //Need to wait plugin dependencies before load plugin
        for (const script of jsscripts) {
          depedencypluginlibrariespromises.push(new Promise((resolve, reject) => {
            this._loadScript(script)
              .done(() => resolve())
              .fail(() => reject())
          }));
        }
        try {
          //when plugin dependencies are loaded
          await Promise.all(depedencypluginlibrariespromises);
          const baseUrl = `${this.pluginsBaseUrl}${name}`;
          //create script url
          const scriptUrl = `${baseUrl}/js/plugin.js?${Date.now()}`;
          pluginConfig.baseUrl= this.pluginsBaseUrl;
          this._loadScript(scriptUrl)
            .done(() => {
              //add url to loaded plugin urls
              this._loadedPluginUrls.push(scriptUrl);
              resolve();
            })
            .fail((jqxhr, settings, exception)=>{
              console.warn('[G3W-PLUGIN]', scriptUrl, exception, settings, jqxhr);
              //remove plugin in case of error
              this.removeLoadingPlugin(name, false);
              reject();
            })
        } catch(err) {
          //remove plugin in case of error of dependencies
          this.removeLoadingPlugin(name, false);
          reject();
        }
      } else {
        resolve()
      }
    })
  };

  /**
   *
   * @param pluginName
   * @returns {*}
   */
  this.getPluginConfig = function(pluginName) {
    return this.pluginsConfigs[pluginName];
  };

  /**
   *
   * @returns {*|{}}
   */
  this.getPlugins = function() {
    return this._plugins;
  };

  /**
   *
   * @param pluginName
   * @returns {*}
   */
  this.getPlugin = function(pluginName) {
    return this._plugins[pluginName];
  };

  /**
   * Method to check if a plugin is in configuration and will be added to application
   * @param pluginName
   * @returns {boolean}
   */
  this.isPluginInConfiguration = function(pluginName) {
    return this._configurationPlugins.indexOf(pluginName) !== -1;
  };

  /**
   *
   * @param pluginName
   * @returns {*}
   */
  this.isTherePlugin = function(pluginName) {
    return this.pluginsConfigs[pluginName];
  }
}

inherit(PluginsRegistry, G3WObject);

export default new PluginsRegistry();
