var inherit = require('./utils').inherit;
var base = require('./utils').base;
var Layer = require('./layer');
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
inherit(WMSSingleLayer,Layer)
var proto = WMSSingleLayer.prototype;

proto.getLayer = function(){
 var olLayer = this._olLayer;
  if (!olLayer){
    olLayer = this._olLayer = this._makeOlLayer();
  }
  return olLayer;
};

proto.getLayerConfigs = function(){
  return [this.layer];
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

proto.addLayer = function(layerConfig){
  this.layer = layerConfig;
};

proto.toggleLayer = function(layer){
  var visible = this._olLayer.getVisible();
  this._olLayer.setVisible(!visible);
};
  
proto.update = function(extraParams){
  var olLayer = this.getLayer();
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
  return this.config.defaultUrl;
};

proto.getQueryLayers = function(){
  var queryLayers = [];
  
  if (Layer.isQueryable(this.layer)) {
    var queryEnbaled = this.layer.visible && !this.layer.disabled;
    if (this.layer.infowhennotvisible && (this.layer.infowhennotvisible === true)) {
      queryEnbaled = true;
    }
    
    if (queryEnbaled) {
      var queryLayerName;
      if (this.layer.infolayer && this.layer.infolayer != '') {
        queryLayerName = this.layer.infolayer;
      }
      else {
        queryLayerName = this.layer.name;
      }
      queryLayers.push({
        layerName: this.layer.name,
        queryLayerName: queryLayerName
      });
    }
  }
  
  return queryLayers;
};

module.exports = WMSSingleLayer;

