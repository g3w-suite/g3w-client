var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');

function Plugin(options){
  this.name = name;
  this.tools = [];
}
inherit(Plugin,G3WObject);

var proto = Plugin.prototype;

proto.load = function() {
  var d = $.Deferred();
  var url = 'lib/plugins/'+this.name;
  $script(url,function(){
    d.resolve();
  });
  return d.promise();
}

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
