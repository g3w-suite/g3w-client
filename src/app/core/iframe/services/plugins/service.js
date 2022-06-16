import PluginsRegistry from 'core/plugin/pluginsregistry';
import BaseService from '../baseservice';

class BasePluginService extends BaseService {
  constructor() {
    super();
    // common attributes between plugin service
    this.pluginName;
    this.dependencyApi = {};
  }

  async init({ layers = {} } = {}) {
    this.layers = layers;
    // check if the plugin in in configuration
    if (PluginsRegistry.isPluginInConfiguration(this.pluginName)) {
      const plugin = PluginsRegistry.getPlugin(this.pluginName);
      if (plugin) {
        this.setDependencyApi(plugin.getApi());
        this.setReady(true);
      } else {
        PluginsRegistry.onafter('registerPlugin', async (plugin) => {
          await plugin.isReady();
          if (plugin.getName() === this.pluginName) {
            this.setDependencyApi(plugin.getApi());
            this.setReady(true);
          }
        });
      }
    }
  }

  clear() {
    // TO OVERWRITE
  }

  setDependencyApi(api = {}) {
    this.dependencyApi = api;
  }

  getDependecyApi() {
    return this.dependencyApi;
  }
}

export default BasePluginService;
