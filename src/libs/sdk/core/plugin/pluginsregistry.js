var base = require('core/utils/utils').base;
var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');
var ApplicationService = require('core/applicationservice');

//var Plugin = require('./plugin');
//var ToolsService = require('core/plugin/toolsservice');

function PluginsRegistry() {
  var self = this;
  this.config = null;
  // un domani questo sarà dinamico
  this._plugins = {};

  this.setters = {
    registerPlugin: function(plugin){
      if (!self._plugins[plugin.name]) {
        self._plugins[plugin.name] = plugin;
        console.log("Registrato plugin "+plugin.name);
      }
    }
  };
  
  base(this);
  
  this.init = function(options){
    var self = this;
    this.pluginsBaseUrl = options.plusingBaseUrl
    this.pluginsConfigs = options.pluginsConfigs;
    _.forEach(this.pluginsConfigs,function(pluginConfig,name){
      self._setup(name,pluginConfig);
    })
  };
  
  this._setup = function(name,pluginConfig) {

    if (pluginConfig){
      var url = this.pluginsBaseUrl+'plugins/'+name+'/plugin.js';
      $script(url);
    }
  };
  
  this.getPluginConfig = function(pluginName) {
    return this.pluginsConfigs[pluginName];
  };

}

inherit(PluginsRegistry,G3WObject);

module.exports = new PluginsRegistry
