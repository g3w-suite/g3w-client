var inherit = require('./utils').inherit;
var Context = require('g3w/core/context');
var PluginsService = require('./pluginsservice');

// Public interface
function PluginsRegistry(){
  var self = this;
  this.state = _registry.state;
  //config generale
  this.setup = function(config){
    return _registry.setup(config).then(function(){
      self.emit('loaded');
    })
  };
  this.addPlugin = function(pluginName){
    _registry.addPlugin(pluginName);
  };
  this.getPlugin = function(pluginName){
    return _registry.getPlugin(pluginName);
  };
  this.removePlugin = function(pluginName){
    return _registry.removePlugin(pluginName);
  }
}

// Make the public service en Event Emitter
inherit(PluginsRegistry,EventEmitter);

// Private
var _registry = {
  initialized: false,
  config: null,
  testing: true,
  state: {
    plugins: []
  },
  //config generale
  setup: function(config){
    if (!this.initialized){
      return this.setupState(config);
    }
  },
  setupState: function(config){
     var self = this;
     var pluginFullConfiguration = this.getPluginsFullConfig(config);
     return pluginFullConfiguration.then(function(plugins){
        plugins.forEach(function(_plugin){
          if(_plugin.active){
            self.state.plugins.push(_plugin);
          }
        })
     })

  },
  setActivePlugin: function(pluginName){
    var project = this.getProject(pluginName);
    if(!project){
      var deferred = $.Deferred();
      return deferred.reject("Plugin doesn't exist");
      return deferred.promise();
    }
    else {
        PluginsService.setActivePlugin(project);
    };
  },
  removePlugin: function(pluginName) {
    var plugin = this.getPlugin(pluginName);
    var activePlugin;
    if (plugin) {
      activePlugin = PluginsService.getActivePlugin(pluginName);
      if (activePlugin == plugin.name){
        PluginsService.setActivePlugin('');
      }
      _.pull(this.state.plugins,plugin);
    }
  },
  getPlugin: function(pluginName){
    var plugin = null;
    this.state.plugins.forEach(function(_plugin){
      if (plugin.name == pluginName) {
        plugin = plugin;
      }
    })
    return plugin;
  },

  //ritorna una promises
  getPluginsFullConfig: function(pluginsConfig){
    var self = this;
    var deferred = $.Deferred();
    //nel caso di test locale
    if (this.testing){
      setTimeout(function(){
        var pluginsFullConfig;
        pluginsFullConfig = require('./plugins_test_configurations');
        deferred.resolve(pluginsFullConfig);
      },100);
    }//altrimenti nella realtà fa una chiamata al server e una volta ottenuto il progetto risolve l'oggetto defer ???
    else {
      //da implementare se il caso url dove ritorna la configuraione dei plugin
    }
    return deferred.promise();
  },
};

//come test istanzio plugin registry

module.exports = new PluginsRegistry();
