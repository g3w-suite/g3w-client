var RasterLayers = require('g3w-ol3/src/layers/rasters');

function MapLayer(options){
  var _mapLayer = new _MapLayer(options);
  
  this.getOlLayer = function(){
    return _mapLayer.olLayer;
  };
  
  this.getLayerId = function(){
    return _mapLayer.layerId;
  };
  
  this.addLayer = function(layer){
    _mapLayer.addLayer(layer);
  };
  
  this.toggleLayer = function(layer){
    _.forEach(_mapLayer.layers,function(_layer){
      if (_layer.id == layer.id){
        _layer.visible = layer.visible;
      }
    });
    _mapLayer.updateLayers();
  };
  
  this.update = function(){
    _mapLayer.updateLayers();
  }
}

function _MapLayer(options){
  this.LAYERTYPE = {
    LAYER: 'layer',
    METALAYER: 'metalayer'
  };
  
  this.layerId = options.layerId;
  this.olLayer = null;
  this.layers = [];
  
  var wmsConfig = {
    name: this.layerId,
    url: options.url
  }
  this.olLayer = new RasterLayers.WMSLayer(wmsConfig);
}

var proto = _MapLayer.prototype;

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
  this.olLayer.getSource().updateParams({
    layers: _.join(_.map(visibleLayers,'name'),',')
  });
};

module.exports = MapLayer;

