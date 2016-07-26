var base = require('core/utils/utils').base;
var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');

//var Plugin = require('./plugin');
//var ToolsService = require('core/plugin/toolsservice');

function PluginsRegistry(){
  var self = this;
  this.config = null;
  // un domani questo sarà dinamico
  this._plugins = {};
  this.state = {
    toolsproviders: []
  };
  
  this.setters = {
    setToolsProvider: function(plugin) {
      self.state.toolsproviders.push(plugin);
    },
    registerPlugin: function(plugin){
      if (!self._plugins[plugin.name]) {
        self._plugins[plugin.name] = plugin;
        console.log("Registrato plugin "+plugin.name)
      }
    }
  }
  
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
    var self = this;
    if (pluginConfig){
      var url = this.pluginsBaseUrl+'plugins/'+name+'/plugin.js';
      $script(url);
    }
  };
  
  this.activate = function(plugin) {
    var tools = plugin.getTools();
    if (tools.length) {
      ToolsService.registerToolsProvider(plugin);
    }
  };
};

inherit(PluginsRegistry,G3WObject);

module.exports = new PluginsRegistry
