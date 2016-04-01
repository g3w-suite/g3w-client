var inherit = require('./utils').inherit;
var StateProvider = require('./stateprovider');

var plugins = {
  "g3w-iternet": require("g3w-iternet/plugin")
};

function PluginsService(){
  var self = this;
  this.config = null;
  // un domani questo sarà dinamico
  this.availablePlugins = plugins;
  this.state = {
    activeplugins: ['g3w-iternet'],
    toolsproviders: []
  };
  
  this.init = function(config){
    this.config = config;
    _.forEach(this.state.activeplugins,function(key){
      var plugin = self.availablePlugins[key];
      if (plugin.providesTools()){
        self.state.toolsproviders.push(plugin);
      }
    })
    this.emit("initend");
  };
};

inherit(PluginsService,StateProvider);

module.exports = new PluginsService
