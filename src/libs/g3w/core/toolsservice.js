var inherit = require('./utils').inherit;
var StateProvider = require('./stateprovider');
var PluginsService = require('./pluginsservice');

function ToolsService(){
  var self = this;
  this.config = null;
  this._actions = {};
  this.state = {
    tools: []
  };
  
  PluginsService.on("initend",function(){
    _.forEach(PluginsService.state.toolsproviders,function(plugin){
      self._mergeTools(plugin.getTools());
      self._addActions(plugin);
    })
  });
  
  this.init = function(config){
    this.config = config;
    this.setState();
  };
  
  this.setState = function(){
    this._mergeTools(this.config.tools);
  };
  
  this.fireAction = function(actionid){
    var plugin = this._actions[actionid];
    var method = this._actionMethod(actionid);
    plugin[method]();
  };
  
  this._actionMethod = function(actionid){
    var namespace = actionid.split(":");
    return namespace.pop();
  };
  
  this._mergeTools = function(tools){
    self.state.tools = _.concat(self.state.tools,tools);
  };
  
  this._addActions = function(plugin){
    _.forEach(plugin.getTools(),function(tool){
      _.forEach(plugin.getActions(tool),function(action){
        self._actions[action.id] = plugin;
      })
    })
  };
};

// Make the public service en Event Emitter
inherit(ToolsService,StateProvider);

module.exports = new ToolsService
