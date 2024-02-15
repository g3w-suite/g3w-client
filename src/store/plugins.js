/**
 * @file Store G3W-CLIENT plugins (editing, qplotly, qtimeseries, ...)
 * @since v3.6
 */

import ProjectsRegistry   from 'store/projects';
import ApplicationService from 'services/application';
import G3WObject          from 'core/g3wobject';

/**
 * law project configuration on project is handle as plugin
 * @type {string[]}
 */
const OTHERPLUGINS = ['law'];

class PluginsRegistry extends G3WObject {

  constructor() {

    super();

    this.config                = null;
    this._plugins              = {};
    this._configurationPlugins = [];
    this.pluginsConfigs        = {};
    this._loadedPluginUrls     = [];

    this.setters = {
      registerPlugin(plugin) {
        if (!this._plugins[plugin.name]) {
          this._plugins[plugin.name] = plugin;
        }
      },
    };

    /**
     * CHECK IF STILL USEFUL. IT RELATED TO CHANGE MAP OLD BEHAVIOR (PREVIOUS VERSION 3.4).
     * NOW WHEN CHANGE MAP IS TRIGGER, PAGE IS RELOADED.
     */
    ProjectsRegistry.onafter('setCurrentProject', project => { this.gidProject = project.getGid(); });

  }

  /**
   * initialize plugin
   */
  init(options = {}) {
    return new Promise(async (resolve, reject) => {
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
        resolve(await this._loadPlugins());
      } catch(e) {
        reject(e);
      }
    })
  }

  /**
   * @FIXME add description
   */
  addLoadingPlugins() {
    Object.keys(this.pluginsConfigs).forEach(plugin => ApplicationService.loadingPlugin(plugin));
  }

  /**
   * @param plugin
   * @param ready
   */
  removeLoadingPlugin(plugin, ready) {
    ApplicationService.loadedPlugin(plugin, ready);
  }

  /**
   * @returns {Promise<{-readonly [P in keyof Promise<unknown>[]]: PromiseSettledResult<Awaited<Promise<unknown>[][P]>>}>}
   * 
   * @private
   */
  _loadPlugins() {
    return Promise.allSettled(Object
      .entries(this.pluginsConfigs)
      .map(([name, pluginConfig]) => this._setup(name, pluginConfig)));
  }

  /**
   * @FIXME add description
   */
  setDependencyPluginConfig() {
    for (const pluginName in this.pluginsConfigs){
      const dependecyPluginConfig = this.pluginsConfigs[pluginName].plugins;
      if (dependecyPluginConfig) {
        Object
          .keys(dependecyPluginConfig)
          .forEach(pluginName => {this.pluginsConfigs[pluginName] = {...this.pluginsConfigs[pluginName], ...dependecyPluginConfig[pluginName]}})
      }
    }
  }

  /**
   * @FIXME add description
   */
  setOtherPlugins() {
    const law = OTHERPLUGINS[0];
    if (this.otherPluginsConfig && this.otherPluginsConfig[law] && this.otherPluginsConfig[law].length) {
      // law plugin
      this.pluginsConfigs[law] = this.otherPluginsConfig[law];
      this.pluginsConfigs[law].gid = this.otherPluginsConfig.gid;
    } else {
      delete this.pluginsConfigs[law];
    }
  }

  /**
   * reaload plugin in case of change map
   */
  reloadPlugins(initConfig, project) {
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
  }

  /**
   * setup plugin config only filtered by gid configuration
   * 
   * @param config
   */
  setPluginsConfig(config={}) {
    const enabledPluginConfig = {};
    Object.entries(config)
      .filter(([,pluginConfig]) => pluginConfig.gid === this.gidProject)
      .forEach(([pluginName, pluginConfig]) => enabledPluginConfig[pluginName] = pluginConfig);
    this.pluginsConfigs = enabledPluginConfig;
  }

  /**
   * Load external script
   * 
   * @param url
   * @returns {*}
   * 
   * @private
   */
  _loadScript(url) {
    return $.getScript(url);
  }

  /**
   * Load plugin script
   */
  _setup(name, pluginConfig) {
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
            .fail((jqxhr, settings, exception) => {
              console.warn('[G3W-PLUGIN]', scriptUrl, exception, settings, jqxhr);
              this.removeLoadingPlugin(name, false);
              reject();
            })
        } catch(err) {
          this.removeLoadingPlugin(name, false);
          reject();
        }
      } else {
        resolve();
      }
    })
  }

  /**
   * @param pluginName
   * 
   * @returns {*}
   */
  getPluginConfig(pluginName) {
    return this.pluginsConfigs[pluginName];
  }

  /**
   * @returns {*|{}}
   */
  getPlugins() {
    return this._plugins;
  }

  /**
   * @param pluginName
   * 
   * @returns {*}
   */
  getPlugin(pluginName) {
    return this._plugins[pluginName];
  }

  /**
   * Check if a plugin is in configuration and will be added to application
   */
  isPluginInConfiguration(pluginName) {
    return -1 !== this._configurationPlugins.indexOf(pluginName);
  };

  /**
   * @param pluginName
   * 
   * @returns {*}
   */
  isTherePlugin(pluginName) {
    return this.pluginsConfigs[pluginName];
  }

}

export default new PluginsRegistry();
