const { base, inherit } = require('core/utils/utils');
const PluginsRegistry = require('core/plugin/pluginsregistry');
const BaseService = require('../baseservice');

function BasePluginService(){
  base(this);
  // common attributes between plugin service
  this.pluginName;
  this.dependencyApi ={};
  this.init = async function({layers={}}={}){
    this.layers = layers;
    // check if the plugin in in configuration
    if (PluginsRegistry.isPluginInConfiguration(this.pluginName)) {
      const plugin = PluginsRegistry.getPlugin(this.pluginName);
      if (plugin) {
        this.setDependencyApi(plugin.getApi());
        this.setReady(true);
      } else {
        PluginsRegistry.onafter('registerPlugin', async plugin =>{
          await plugin.isReady();
          if (plugin.getName() === this.pluginName) {
            this.setDependencyApi(plugin.getApi());
            this.setReady(true);
          }
        })
      }
    }
  };


  this.clear = function(){
    //TO OVERWRITE
  };
}

inherit(BasePluginService, BaseService);

const proto = BasePluginService.prototype;

proto.setDependencyApi = function(api={}){
  this.dependencyApi = api;
};

proto.getDependecyApi = function(){
  return this.dependencyApi;
};


module.exports =  BasePluginService;



