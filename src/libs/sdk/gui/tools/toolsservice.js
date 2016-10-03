var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

function ToolsService(){
  var self = this;
  this.config = null;
  this._actions = {};
  this.state = {
    toolsGroups: []
  };
  this.setters = {
    //inserita possibilità di dare ordine al plugin di visualizzazione
    addToolGroup: function(order, group) {
      self.state.toolsGroups.splice(order, 0, group);
    }
  };
  this.addTools = function(order, groupName, tools) {
    var self = this;
    var group = this._getToolsGroup(groupName);
    if (!group) {
      group = {
        name: groupName,
        tools: []
      };
      this.addToolGroup(order, group);
    }
    _.forEach(tools, function(tool){
      group.tools.push(tool);
      self._addAction(tool);
    });
  };
  this.removeTool = function(toolId) {
  };
  this.updateTool = function(order, toolId) {

  };
  this.updateToolsGroup = function(order, groupConfig) {
    this.state.toolsGroups.$set(order, groupConfig)
  };
  this.getState = function() {
    return this.state;
  };
  this.fireAction = function(actionId){
    var action = this._actions[actionId];
    action();
  };
  this._getToolsGroup = function(groupName) {
    var group = null;
    _.forEach(this.state.toolsGroups,function(_group){
      if (_group.name == groupName) {
        group = _group;
      }
    });
    return group;
  };
  this._addAction = function(tool) {
    var actionId = Math.floor(Math.random() * 1000000)+1;
    tool.actionId = actionId;
    this._actions[actionId] = tool.action;
  };
  base(this);
}

inherit(ToolsService, G3WObject);

module.exports = ToolsService;
