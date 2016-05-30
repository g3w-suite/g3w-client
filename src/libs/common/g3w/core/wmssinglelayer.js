var inherit = require('./utils').inherit;
var base = require('./utils').base;
var Layer = require('./layer');
var RasterLayers = require('g3w-ol3/src/layers/rasters');

function WMSSingleLayer(config){
  base(this,config);
  var self = this;
  this.LAYERTYPE = {
    LAYER: 'layer',
    METALAYER: 'metalayer'
  };

  this._olLayer = null;
  this.layer = null;
}
inherit(WMSSingleLayer,Layer)
var proto = WMSSingleLayer.prototype;

proto.getLayer = function(){
 var olLayer = this._olLayer;
  if (!olLayer){
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
  var wmsConfig = {
    url: this.config.defaultUrl,
    id: this.config.id,
    layers: this.layer.name
  };
  
  if (this.layer.source && this.layer.source.type == 'wms'){
    wmsConfig.url = this.layer.source.url;
    wmsConfig.layers = this.layer.source.layers;
  };

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
};

proto.toggleLayer = function(layer){
  var visible = this._olLayer.getVisible();
  this._olLayer.setVisible(!visible);
};
  
proto.update = function(){
  this._olLayer.setVisible(this.layer.visible);
};

proto.isVisible = function(){
  return this.layer.visible;
};

proto.getQueryUrl = function(){
  if (this.layer.infourl && this.layer.infourl != '') {
    return this.layer.infourl;
  }
  return this.config.defaultUrl;
};

module.exports = WMSSingleLayer;

