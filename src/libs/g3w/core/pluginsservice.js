var inherit = require('./utils').inherit;
var StateProvider = require('./stateprovider');

var plugins = {
  "iternet": require("g3w-iternet/plugin")
};

function PluginsService(){
  var self = this;
  this.config = null;
  // un domani questo sarà dinamico
  this.availablePlugins = {};
  this.state = {
    toolsproviders: []
  };
  
  this.init = function(config){
    this.config = config;
    this._setAvailablePlugins(config);
    
    _.forEach(this.availablePlugins,function(plugin){
      if (plugin.providesTools()){
        self.state.toolsproviders.push(plugin);
      }
    })
    this.emit("initend");
  };
  
  this._setAvailablePlugins = function(config){
    if (_.has(config,"plugins")){
      _.forEach(plugins,function(plugin){
        _.forEach(config.plugins,function(pluginConfig,name){
          if (plugin.name == name) {
            // inizializzo il plugin
            plugin.init(pluginConfig);
            self.availablePlugins[name] = plugin;
          }
        })
      })
    }
  };
};

inherit(PluginsService,StateProvider);

module.exports = new PluginsService
