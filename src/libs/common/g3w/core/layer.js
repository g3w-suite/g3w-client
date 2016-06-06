var inherit = require('./utils').inherit;
var base = require('./utils').base;
var G3WObject = require('g3w/core/g3wobject');

var CAPABILITIES = {
  QUERY: 1,
  EDIT: 2
};

var EDITOPS = {
  INSERT: 1,
  UPDATE: 2,
  DELETE: 4
};

function Layer(config){
  this.config = config || {};
  this.id = config.id;
  base(this);
}
inherit(Layer,G3WObject);

var proto = Layer.prototype;

proto.getQueryUrl = function(){
  //
};

proto.getQueryLayers = function(){
 //
};

Layer.isQueryable = function(layerConfig){
  return (layerConfig.capabilities && (layerConfig.capabilities && CAPABILITIES.QUERY)) ? true : false;
};

module.exports = Layer;
