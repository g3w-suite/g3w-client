var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');

function ToolsService(){
  var self = this;
  this.config = null;
  this._actions = {};
  this.state = {
    tools: []
  };
  
  this.init = function(config){
    this.config = config;
    this.setState();
  };
  
  this.setState = function(){
    this._mergeTools(this.config.tools);
  };
  
  this.registerToolsProvider = function(plugin){
    self._mergeTools(plugin.getTools());
    self._addActions(plugin);
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
}

// Make the public service en Event Emitter
inherit(ToolsService,G3WObject);

module.exports = new ToolsService;
