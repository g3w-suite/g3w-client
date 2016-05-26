var inherit = require('./utils').inherit;
var base = require('./utils').base;
var Layer = require('./layer');
var RasterLayers = require('g3w-ol3/src/layers/rasters');

function WMSMetaLayer(options){
  base(this,options);
  
  var self = this;
  this.id = options.id;
  this._olLayer = null;
  this.layers = [];
  
  this._olLayer = null;
  
  this._wmsConfig = {
    name: this.id,
    url: this.options.url
  };
}
inherit(WMSMetaLayer,Layer)
var proto = WMSMetaLayer.prototype;

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
  this.layers.push(layerConfig);
};

proto.toggleLayer = function(layer){
  _.forEach(this.layers,function(_layer){
    if (_layer.id == layer.id){
      _layer.visible = layer.visible;
    }
  });
  this._updateLayers();
};
  
proto.update = function(){
  this._updateLayers();
};

proto.getVisibleLayers = function(){
  var visibleLayers = [];
  _.forEach(this.layers,function(layer){
    if (layer.visible){
      visibleLayers.push(layer);
    }    
  })
  return visibleLayers;
}

proto._updateLayers = function(){
  var visibleLayers = this.getVisibleLayers();
  if (visibleLayers.length > 0) {
    this._olLayer.setVisible(true);
    this._olLayer.getSource().updateParams({
      LAYERS: _.join(_.map(visibleLayers,'name'),',')
    });
  }
  else {
    this._olLayer.setVisible(false);
  }
};

module.exports = WMSMetaLayer;

