import ApplicationService  from 'core/applicationservice';
import ProjectsRegistry  from 'core/project/projectsregistry';
import G3WObject from 'core/g3wobject';
const OTHERPLUGINS = ['law'];

class PluginsRegistry extends G3WObject{
  constructor() {
    super({
      setters: {
        //setters to register plugin
        registerPlugin(plugin) {
          if (!this._plugins[plugin.name]) this._plugins[plugin.name] = plugin;
        }
      }
    })
    this.config = null;
    this._plugins = {};
    this._configurationPlugins = [];
    this.pluginsConfigs = {};
    this._loadedPluginUrls = [];

    ProjectsRegistry.onafter('setCurrentProject', project =>{
      this.gidProject = project.getGid();
    });

  }

  // initialize plugin
  init(options={}) {
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
      } catch(error) {
        reject(error);
      }
    })
  };

  addLoadingPlugins() {

    Object.keys(this.pluginsConfigs).forEach(plugin => {
      ApplicationService.loadingPlugin(plugin);
    });
  };

  removeLoadingPlugin(plugin, ready) {
    ApplicationService.loadedPlugin(plugin, ready);
  };

  _loadPlugins() {
    const pluginLoadPromises = Object.entries(this.pluginsConfigs).map(([name, pluginConfig]) => {
      return this._setup(name, pluginConfig);
    });
    return Promise.allSettled(pluginLoadPromises)
  };

  setDependencyPluginConfig() {
    for (const pluginName in this.pluginsConfigs) {
      const dependecyPluginConfig = this.pluginsConfigs[pluginName].plugins;
      dependecyPluginConfig && Object.keys(dependecyPluginConfig).forEach(pluginName =>{
        this.pluginsConfigs[pluginName] = {...this.pluginsConfigs[pluginName], ...dependecyPluginConfig[pluginName]}
      })
    }
  };

  setOtherPlugins() {
    const law = OTHERPLUGINS[0];
    if (this.otherPluginsConfig && this.otherPluginsConfig[law] && this.otherPluginsConfig[law].length) {
      // law plugin
      this.pluginsConfigs[law] = this.otherPluginsConfig[law];
      this.pluginsConfigs[law].gid = this.otherPluginsConfig.gid;
    } else delete this.pluginsConfigs[law];
  };

  // reaload plugin in case of change map
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
      } catch(error) {
        reject(error)
      }
    })
  };

  /**
   * setup plugin config only filtered by gid configuration
   * @param config
   */
  setPluginsConfig(config={}) {
    const enabledPluginConfig = {};
    Object.entries(config)
      .filter(([,pluginConfig]) => pluginConfig.gid === this.gidProject)
      .forEach(([pluginName, pluginConfig]) =>{
        enabledPluginConfig[pluginName] = pluginConfig;
      });
    this.pluginsConfigs = enabledPluginConfig;
  };

  /**
   * Method to load external script
   * @param url
   * @returns {*}
   * @private
   */
  _loadScript(url) {
    return $.getScript(url);
  };

  //load plugin script
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
            .fail(()=>{
              this.removeLoadingPlugin(name, false);
              reject();
            })
        } catch(err) {
          this.removeLoadingPlugin(name, false);
          reject();
        }
      } else resolve()
    })
  };

  getPluginConfig(pluginName) {
    return this.pluginsConfigs[pluginName];
  };

  getPlugins() {
    return this._plugins;
  };

  getPlugin(pluginName) {
    return this._plugins[pluginName];
  };

  // method to check if a plugin is in confiuration and will be added to apllication
  isPluginInConfiguration(pluginName) {
    return this._configurationPlugins.indexOf(pluginName) !== -1;
  };

  isTherePlugin(pluginName) {
    return this.pluginsConfigs[pluginName];
  }
}

export default new PluginsRegistry();







