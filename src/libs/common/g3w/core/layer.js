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

Layer.isQueryable = function(layerState){
  var queryEnabled = false;
  var queryableForCababilities = (layerState.capabilities && (layerState.capabilities && CAPABILITIES.QUERY)) ? true : false;
  if (queryableForCababilities) {
    // è interrogabile se visibile e non disabilitato (per scala) oppure se interrogabile comunque (forzato dalla proprietà infowhennotvisible)
    var queryEnabled = (layerState.visible && !layerState.disabled) || (layerState.infowhennotvisible && (layerState.infowhennotvisible === true));
  }
  return queryEnabled;
};

Layer.getQueryLayerName = function(layerState) {
  var queryLayerName;
  if (layerState.infolayer && layerState.infolayer != '') {
    queryLayerName = layerState.infolayer;
  }
  else {
    queryLayerName = layerState.name;
  }
  return queryLayerName;
};

module.exports = Layer;
