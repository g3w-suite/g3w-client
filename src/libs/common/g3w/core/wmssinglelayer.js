var inherit = require('./utils').inherit;
var base = require('./utils').base;
var Layer = require('./layer');
var RasterLayers = require('g3w-ol3/src/layers/rasters');

function WMSSingleLayer(options){
  base(this,options);
  var self = this;
  this.LAYERTYPE = {
    LAYER: 'layer',
    METALAYER: 'metalayer'
  };
  
  this.id = options.id;
  this._olLayer = null;
  this.layer = null;
  
  this._wmsConfig = {
    name: this.id,
    url: this.options.url
  };
}
inherit(WMSSingleLayer,Layer)
var proto = WMSSingleLayer.prototype;

proto.getLayer = function(){
  var olLayer;
  if (!this._olLayer){
    olLayer = this._olLayer = this._makeOlLayer();
  }
  return olLayer;
};

proto.getSource = function(){
  return this._olLayer.getSource();
};

proto.getId = function(){
  return this.id;
};

proto._makeOlLayer = function(){
  var self = this;
  var wmsConfig = this._wmsConfig;

  var olLayer = new RasterLayers.WMSLayer(wmsConfig);
  
  olLayer.getSource().on('imageloadstart', function() {
        self.emit("loadstart");
      });
  olLayer.getSource().on('imageloadend', function() {
      self.emit("loadend");
  });
  
  return olLayer
};

proto.addLayer = function(layerConfig){
  this.layer = layerConfig;
  
  if (layerConfig.source && layerConfig.source.type == 'wms'){
    this._wmsConfig.url = layerConfig.source.url;
    this._wmsConfig.layers = layerConfig.source.layers;
  };
};

proto.toggleLayer = function(layer){
  var visible = this._olLayer.getVisible();
  this._olLayer.setVisible(!visible);
};
  
proto.update = function(){
  this._olLayer.setVisible(this.layer.visible);
};

proto.getVisibleLayers = function(){
  var visibleLayers = [];
  if (this.layer.visible){
    visibleLayers.push(layer);
  }
  return visibleLayers;
};

module.exports = WMSSingleLayer;

