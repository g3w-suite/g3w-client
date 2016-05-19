var inherit = require('./utils').inherit;
var base = require('./utils').base;
var Layer = require('./layer');
var RasterLayers = require('g3w-ol3/src/layers/rasters');

function WMSLayer(options){
  var self = this;
  this.LAYERTYPE = {
    LAYER: 'layer',
    METALAYER: 'metalayer'
  };
  
  this.id = options.id;
  this._olLayer = null;
  this.layers = [];
  
  var wmsConfig = {
    name: this.id,
    url: options.url
  }
  this._olLayer = new RasterLayers.WMSLayer(wmsConfig);
  this._olLayer.getSource().on('imageloadstart', function() {
      self.emit("loadstart");
    });
  this._olLayer.getSource().on('imageloadend', function() {
      self.emit("loadend");
  });
  
  base(this,options);
}
inherit(WMSLayer,Layer)
var proto = WMSLayer.prototype;

proto.getLayer = function(){
  return this._olLayer;
};

proto.getSource = function(){
  return this._olLayer.getSource();
};

proto.getId = function(){
  return this.id;
};

proto.addLayer = function(layer){
  this.addLayer(layer);
};

proto.toggleLayer = function(layer){
  _.forEach(this.layers,function(_layer){
    if (_layer.id == layer.id){
      _layer.visible = layer.visible;
    }
  });
  this.updateLayers();
};
  
proto.update = function(){
  this.updateLayers();
};

proto.addLayer = function(layerConfig){
  this.layers.push(layerConfig);
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

proto.updateLayers = function(){
  var visibleLayers = this.getVisibleLayers();
  this._olLayer.getSource().updateParams({
    layers: _.join(_.map(visibleLayers,'name'),',')
  });
};

module.exports = WMSLayer;

