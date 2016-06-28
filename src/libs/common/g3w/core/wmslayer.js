var inherit = require('./utils').inherit;
var base = require('./utils').base;
var MapLayer = require('./maplayer');
var RasterLayers = require('g3w-ol3/src/layers/rasters');

function WMSLayer(options){
  var self = this;
  this.LAYERTYPE = {
    LAYER: 'layer',
    MULTILAYER: 'multilayer'
  };
  
  this.id = options.id;
  this._olLayer = null;
  this.layers = [];
  
  this._olLayer = null;
  
  base(this,options);
}
inherit(WMSLayer,MapLayer)
var proto = WMSLayer.prototype;

proto.getOLLayer = function(){
  var olLayer = this._olLayer;
  if (!olLayer){
    olLayer = this._olLayer = this._makeOlLayer();
  }
  return olLayer;
};

proto.getSource = function(){
  return this.getOLLayer().getSource();
};

proto.toggleLayer = function(layer){};

proto.addLayer = function(layerConfig){};
  
proto.update = function(){};

proto.isVisible = function(){};

proto.getInfoFormat = function() {
  return 'application/vnd.ogc.gml';
};

proto.getGetFeatureInfoUrl = function(coordinate,resolution,epsg,params){
  return this.getOLLayer().getSource().getGetFeatureInfoUrl(coordinate,resolution,epsg,params);
};

proto.getQueryUrl = function(){};

proto.getQueryLayers = function(){};

proto._makeOlLayer = function(){};

module.exports = WMSLayer;
