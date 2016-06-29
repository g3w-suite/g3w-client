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

LayerState = {};

LayerState.isQueryable = function(layerState){
  var queryEnabled = false;
  var queryableForCababilities = (layerState.capabilities && (layerState.capabilities && CAPABILITIES.QUERY)) ? true : false;
  if (queryableForCababilities) {
    // è interrogabile se visibile e non disabilitato (per scala) oppure se interrogabile comunque (forzato dalla proprietà infowhennotvisible)
    var queryEnabled = (layerState.visible && !layerState.disabled) || (layerState.infowhennotvisible && (layerState.infowhennotvisible === true));
  }
  return queryEnabled;
};

LayerState.getQueryLayerName = function(layerState) {
  var queryLayerName;
  if (layerState.infolayer && layerState.infolayer != '') {
    queryLayerName = layerState.infolayer;
  }
  else {
    queryLayerName = layerState.name;
  }
  return queryLayerName;
};

LayerState.isExternalWMS = function(layerState) {
  return (layerState.source && layerState.source.url);
};

LayerState.getWMSLayerName = function(layerState) {
  var layerName = layerState.name;
  if (layerState.source && layerState.source.layers){
    layerName = layerState.source.layers
  };
  return layerName;
};

LayerState.getOriginURL = function(layerState) {
  var url;
  if (layerState.source && layerState.source.type == 'wms' && layerState.source.url){
    url = layerState.source.url
  };
  return url;
};

module.exports = LayerState;
