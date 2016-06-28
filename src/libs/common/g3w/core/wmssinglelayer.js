var inherit = require('./utils').inherit;
var base = require('./utils').base;
var Layer = require('./layer');
var WMSLayer = require('./wmslayer');
var RasterLayers = require('g3w-ol3/src/layers/rasters');

function WMSSingleLayer(config,extraParams){
  base(this,config);
  var self = this;
  this.LAYERTYPE = {
    LAYER: 'layer',
    MULTILAYER: 'multilayer'
  };

  this._olLayer = null;
  this.layer = null;
  this.extraParams = extraParams;
}
inherit(WMSSingleLayer,WMSLayer)
var proto = WMSSingleLayer.prototype;

proto.getLayerConfigs = function(){
  return [this.layer];
};

proto.getSource = function(){
  return this._olLayer.getSource();
};

proto.addLayer = function(layerConfig){
  this.layer = layerConfig;
};

proto.toggleLayer = function(layer){
  var visible = this._olLayer.getVisible();
  this._olLayer.setVisible(!visible);
};
  
proto.update = function(extraParams){
  var olLayer = this.getOLLayer();
  if (extraParams){
    olLayer.getSource().updateParams(extraParams);
  }
  olLayer.setVisible(this.layer.visible);
};

proto.isVisible = function(){
  return this.layer.visible;
};

proto.getQueryUrl = function(){
  if (this.layer.infourl && this.layer.infourl != '') {
    return this.layer.infourl;
  }
  return this.config.url;
};

proto.getQueryLayers = function(){
  var queryLayers = [];
  
  if (Layer.isQueryable(this.layer)) {
    queryLayers.push({
      layerName: this.layer.name,
      queryLayerName: Layer.getQueryLayerName(this.layer)
    });
  }
  
  return queryLayers;
};

proto._makeOlLayer = function(){
  var self = this;
  var wmsConfig = {
    url: this.config.url,
    id: this.config.id,
    layers: this.layer.name,
    maxResolution: this.layer.maxresolution
  };
  
  if (this.layer.source && this.layer.source.type == 'wms'){
    wmsConfig.url = this.layer.source.url;
    wmsConfig.layers = this.layer.source.layers;
  };

  var WMSLayerClass;
  if (this.config.tiled) {
    WMSLayerClass = RasterLayers.TiledWMSLayer;
  }
  else {
    WMSLayerClass = RasterLayers.WMSLayer;
  }

  var olLayer = new WMSLayerClass(wmsConfig,this.extraParams);
  
  olLayer.getSource().on('imageloadstart', function() {
        self.emit("loadstart");
      });
  olLayer.getSource().on('imageloadend', function() {
      self.emit("loadend");
  });
  
  return olLayer
};

module.exports = WMSSingleLayer;

