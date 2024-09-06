/**
 * @file Store G3W-CLIENT plugins (editing, qplotly, qtimeseries, ...)
 * @since v3.6
 */

import G3WObject          from 'core/g3w-object';
import ApplicationState   from 'store/application-state';

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
     * Name array of initConfig.plugins names
     */
    this._configurationPlugins = [];

    /**
     * Store initConfig.plugins object configuration
     */
    this.pluginsConfigs = {};

    this.setters = {

      /**
       * Setter method to register plugin (called by every plugin when all is ready)
       */
      registerPlugin(plugin) {
        // store plugin into registry (if not already registered)
        if (undefined === this._plugins[plugin.name]) {
          this._plugins[plugin.name] = plugin;
        }
      }
    };
  }

  /**
   * initialize plugin
   * call by applications.js services folder
   *
   * @param { Object } options
   * @param options.project            current project
   * @param options.pluginsBaseUrl     plugin loading urls
   * @param options.pluginsConfigs     plugin configurations
   * @param options.otherPluginsConfig plugins that aren't in configuration server but in project
   */
  async init(options = {}) {
    this.gidProject     = options.project.getGid();
    this.pluginsBaseUrl = options.pluginsBaseUrl;

    // set plugin config filtered by gid
    const enabledPlugins = {};
    Object.entries(options.pluginsConfigs).filter(([,p]) => p.gid === this.gidProject).forEach(([name, config]) => enabledPlugins[name] = config);
    this.pluginsConfigs = enabledPlugins;

    Object.keys(this.pluginsConfigs).forEach(p => this._configurationPlugins.push(p)); // filter
    Object.keys(this.pluginsConfigs).forEach(p => ApplicationState.plugins.push(p));

    // set another plugin on in initConfig.plugins (law for example)
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
      Object
        .entries(this.pluginsConfigs[p].plugins || {})
        .forEach(([name, config]) => this.pluginsConfigs[name] = { ...this.pluginsConfigs[name], ...config })
    }

    // load plugins
    return await Promise
      .allSettled(Object.entries(this.pluginsConfigs)
      .map(async ([name, config]) => {
        if (!config) {
          return;
        }
        config.baseUrl = this.pluginsBaseUrl;
        try {
          // wait plugin dependencies before loading plugin
          await Promise.all((config.jsscripts || []).map(s => _loadScript(s, false)));
          await _loadScript(`${this.pluginsBaseUrl}${name}/js/plugin.js?${Date.now()}`, false);
        } catch(e) {
          console.warn('[G3W-PLUGIN]', e);
          // remove loading plugin in case of error of dependencies
          ApplicationState.plugins = ApplicationState.plugins.filter(p => name !== p);
          return Promise.reject();
        }
      }));
  }

  /**
   * @param name
   *
   * @returns <Object> Plugin configuration server object
   */
  getPluginConfig(name) {
    return this.pluginsConfigs[name];
  }

  /**
   * @returns <Object> key pluginName, value plugin instance
   */
  getPlugins() {
    return this._plugins;
  }

  /**
   * @param name
   *
   * @returns Plugin instance
   */
  getPlugin(name) {
    return this._plugins[name];
  }

  /**
   * Check if a plugin is in configuration and will be added to the application
   *
   * @param name
   *
   * @returns { boolean }
   */
  isPluginInConfiguration(name) {
    return this._configurationPlugins.includes(name);
  }

  /**
   * @param name
   *
   * @returns plugin Configuration
   */
  isTherePlugin(name) {
    return this.pluginsConfigs[name];
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