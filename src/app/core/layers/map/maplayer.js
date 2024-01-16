const { base, inherit } = require('utils');
const G3WObject         = require('core/g3wobject');

function MapLayer(config={}) {
  this.config = config;
  this.id = config.id;
  this.iframe_internal = config.iframe_internal || false;
  this.extent = config.extent;
  this.projection = config.projection;
  this.layer = null;
  this.layers = config.layers || []; // store all enabled layers
  this.allLayers = []; // store all layers
  this.showSpinnerWhenLoading = true;
  base(this);
}

inherit(MapLayer, G3WObject);

const proto = MapLayer.prototype;

proto.getId = function(){
  return this.id;
};

proto.getOLLayer = function() {
  console.log('every sub classes has to be override')
};

proto.update = function(mapState={}, extraParams={}) {
  this._updateLayers(mapState, extraParams);
};

proto.checkLayerDisabled = function(layer, resolution, mapUnits) {
  layer.setDisabled(resolution, mapUnits);
  return layer.isDisabled();
};

// check which layers has to be disabled
proto.checkLayersDisabled = function(resolution, mapUnits) {
  this.allLayers.forEach(layer => this.checkLayerDisabled(layer, resolution, mapUnits));
};

proto.setupCustomMapParamsToLegendUrl = function(params={}){
  //to owerwrite for each map layer subclass
};

module.exports = MapLayer;
