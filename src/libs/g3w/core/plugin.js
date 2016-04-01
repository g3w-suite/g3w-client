var inherit = require('./utils').inherit;
var G3WObject = require('g3w/core/g3wobject');

function Plugin(){
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
