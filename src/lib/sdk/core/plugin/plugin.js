var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');

function Plugin(){
  this.id = "plugin";
  this.tools = [];
}
inherit(Plugin,G3WObject);

var proto = Plugin.prototype;

proto.providesTools = function(){
  return this.tools.length > 0;
};

proto.getTools = function(){
  return this.tools;
};

proto.getActions = function(tool){
  return tool.actions;
};

module.exports = Plugin;
