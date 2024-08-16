/**
 * @file Store G3W-CLIENT plugins (editing, qplotly, qtimeseries, ...)
 * @since v3.6
 */

import G3WObject          from 'core/g3w-object';
import ProjectsRegistry   from 'store/projects';
import ApplicationService from 'services/application';

/**
 * 'law' project configuration on project is handle as plugin
 *
 * @type {string[]}
 */
const OTHERPLUGINS = ['law'];

export default new (class PluginsRegistry extends G3WObject {
  
  constructor() {

    super();

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
    ProjectsRegistry.onafter('setCurrentProject', project => {
      this.gidProject = project.getGid();
    });

  }

  /**
   * initialize plugin
   * call by applications.js services folder
   *
   * @param { Object } options
   * @param options.pluginsBaseUrl     plugin loading urls
   * @param options.pluginsConfigs     plugin configurations
   * @param options.otherPluginsConfig plugins that aren't in configuration server but in project
   */
  async init(options = {}) {
    this.pluginsBaseUrl = options.pluginsBaseUrl; 

    // set plugin config filtered by gid
    const enabledPlugins = {};
    Object.entries(options.pluginsConfigs).filter(([,p]) => p.gid === this.gidProject).forEach(([name, config]) => enabledPlugins[name] = config);
    this.pluginsConfigs = enabledPlugins;

    Object.keys(this.pluginsConfigs).forEach(p => this._configurationPlugins.push(p)); // filter
    Object.keys(this.pluginsConfigs).forEach(p => ApplicationService.loadingPlugin(p));

    // set another plugin on in initConfig.group.plugins (law for example)
    const law = OTHERPLUGINS[0];
    this.otherPluginsConfig = options.otherPluginsConfig || {};
    if (this.otherPluginsConfig && this.otherPluginsConfig[law] && this.otherPluginsConfig[law].length) {
      // law plugin
      this.pluginsConfigs[law]     = this.otherPluginsConfig[law];
      this.pluginsConfigs[law].gid = this.otherPluginsConfig.gid;
    } else {
      delete this.pluginsConfigs[law];
    }

    /** @TODO check if deprecated */
    for (const p in this.pluginsConfigs) {
      const dependecy = this.pluginsConfigs[p].plugins;
      if (dependecy) {
        Object.keys(dependecy).forEach(p => this.pluginsConfigs[p] = { ...this.pluginsConfigs[p], ...dependecy[p] })
      }
    }

    // load plugins
    return await Promise
      .allSettled(Object.entries(this.pluginsConfigs)
      .map(async ([name, config]) => {
        if (!config) {
          return;
        }
        const url      = `${this.pluginsBaseUrl}${name}/js/plugin.js?${Date.now()}`;
        config.baseUrl = this.pluginsBaseUrl;
        try {
          // wait plugin dependencies before loading plugin
          await Promise.all((config.jsscripts || []).map(s => _loadScript(s, false)));
          await _loadScript(url, false);
        } catch(e) {
          console.warn('[G3W-PLUGIN]', e);
          //remove plugin in case of error of dependencies
          ApplicationService.loadedPlugin(name, false); // remove loading plugin
          return Promise.reject();
        }
      }));
  }

  /**
   * @param pluginName
   *
   * @returns <Object> Plugin configuration server object
   */
  getPluginConfig(pluginName) {
    return this.pluginsConfigs[pluginName];
  }

  /**
   * @returns <Object> key pluginName, value plugin instance
   */
  getPlugins() {
    return this._plugins;
  }

  /**
   * @param pluginName
   *
   * @returns Plugin instance
   */
  getPlugin(pluginName) {
    return this._plugins[pluginName];
  }

  /**
   * Check if a plugin is in configuration and will be added to application
   *
   * @param pluginName
   *
   * @returns { boolean }
   */
  isPluginInConfiguration(pluginName) {
    return this._configurationPlugins.indexOf(pluginName) !== -1;
  }

  /**
   * @param pluginName
   *
   * @returns plugin Configuration
   */
  isTherePlugin(pluginName) {
    return this.pluginsConfigs[pluginName];
  }

});

/**
 * Load an external script
 */
function _loadScript(url) {
  return new Promise(function(resolve, reject) {
    const s   = document.createElement('script');
    s.onload  = resolve;
    s.onerror = e => { console.warn(e); reject(new Error('Failed to load script: ' + url)) };
    s.src     = url;
    document.head.appendChild(s);
  });
}