var inherit = require('./utils').inherit;
var base = require('./utils').base;
var Layer = require('./layer');
var RasterLayers = require('g3w-ol3/src/layers/rasters');

function WMSMultiLayer(config,extraParams){
  base(this,config);
  
  var self = this;
  this._olLayer = null;
  this.layers = [];
  this.extraParams = extraParams;
  
  this._olLayer = null;
}
inherit(WMSMultiLayer,Layer)
var proto = WMSMultiLayer.prototype;

proto.getLayer = function(){
  var olLayer = this._olLayer;
  if (!olLayer){
    olLayer = this._olLayer = this._makeOlLayer();
  }
  return olLayer;
};

proto.getLayerConfigs = function(){
  return this.layers;
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
    id: this.config.id
  };
  
  var olLayer = new RasterLayers.WMSLayer(wmsConfig,this.extraParams);
  
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
  
proto.update = function(extraParams){
  this._updateLayers(extraParams);
};

proto.isVisible = function(){
  return this._getVisibleLayers().length > 0;
};

proto._getVisibleLayers = function(){
  var visibleLayers = [];
  _.forEach(this.layers,function(layer){
    if (layer.visible){
      visibleLayers.push(layer);
    }    
  })
  return visibleLayers;
}

proto._updateLayers = function(extraParams){
  var visibleLayers = this._getVisibleLayers();
  if (visibleLayers.length > 0) {
    var params = {
      LAYERS: _.join(_.map(visibleLayers,'name'),',')
    };
    if (extraParams) {
      params = _.assign(extraParams,params);
    }
    this._olLayer.setVisible(true);
    this._olLayer.getSource().updateParams(params);
  }
  else {
    this._olLayer.setVisible(false);
  }
};

proto.getQueryUrl = function(){
  var layer = this.layers[0];
  if (layer.infourl && layer.infourl != '') {
    return layer.infourl;
  }
  return this.config.defaultUrl;
};

proto.getQueryLayers = function(){
  
  // DA REIMPLEMENTARE SULLA BASE DI WMSSingleLayer
  
  /*var layer = this.layers[0];
  var queryLayers = [];
  _.forEach(this.layers,function(layer){
    if (layer.infolayer && layer.infolayer != '') {
      queryLayers.push(layer.infolayer);
    }
    else {
      queryLayers.push(layer.name);
    }
  })
  return queryLayers;*/
};

module.exports = WMSMultiLayer;

