var base = require('core/utils/utils').base;
var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');

function PluginsService(){
  var self = this;
  this.config = null;
  // un domani questo sarà dinamico
  this.plugins = {};
  this.state = {
    toolsproviders: []
  };
  
  this.setters = {
    setToolsProvider: function(plugin) {
      self.state.toolsproviders.push(plugin);
    }
  }
  
  base(this);
  
  this.init = function(config){
    var self = this;
    this.config = config;
    _.forEach(config.plugins,function(plugin){
      self._setup(plugin);
    })
    this.emit("initend");
  };
  
  // Per permettere la registrazione anche in un secondo momento
  this.register = function(plugin){
    if (!this.plugins[plugin.name]) {
      this._setup(plugin);
    }
  }
  
  this._setup = function(plugin){
    var self = this;
    var pluginConfig = this.config.configs[plugin.name];
    if (pluginConfig){
      plugin.init(pluginConfig)
      .then(function(){
        self.plugins[name] = plugin;
        if (plugin.providesTools()){
          self.setToolsProvider(plugin);
        }
      })
    }
  }
};

inherit(PluginsService,G3WObject);

module.exports = new PluginsService
