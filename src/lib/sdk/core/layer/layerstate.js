var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var GeometryTypes = require('core/geometry/geometry').GeometryTypes;

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

LayerState.ServerTypes = {
  OGC: "OGC",
  QGIS: "QGIS",
  Mapserver: "Mapserver",
  Geoserver: "Geoserver",
  ArcGIS: "ArcGIS"
};

LayerState.getGeometryType = function(layerState) {
  return layerState.geometrytype;
};

LayerState.getAttributes = function(layerState) {
  var attributes = [];
  if (layerState.attributes) {
    attributes = _.map(layerState.attributes,function(attribute) {
      return attribute.name;
    })
  }
  return attributes;
};

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

LayerState.getServerType = function(layerState) {
  if (layerState.servertype && layerState.servertype != '') {
    return layerState.servertype;
  }
  else {
    return LayerState.ServerTypes.QGIS;
  }
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
