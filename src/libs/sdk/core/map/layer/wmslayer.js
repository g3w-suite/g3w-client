var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var geo = require('core/utils/geo');
var MapLayer = require('core/map/layer/maplayer');
var RasterLayers = require('g3w-ol3/src/layers/rasters');

function WMSLayer(options,extraParams){
  var self = this;
  this.LAYERTYPE = {
    LAYER: 'layer',
    MULTILAYER: 'multilayer'
  };

  this.extraParams = extraParams;
  this.layers = [];
  
  base(this,options);
}

inherit(WMSLayer,MapLayer);

var proto = WMSLayer.prototype;

proto.getOLLayer = function(withLayers){
  var olLayer = this._olLayer;
  if (!olLayer){
    olLayer = this._olLayer = this._makeOlLayer(withLayers);
  }
  return olLayer;
};

proto.getSource = function(){
  return this.getOLLayer().getSource();
};

proto.getInfoFormat = function() {
  return 'application/vnd.ogc.gml';
};

proto.getGetFeatureInfoUrl = function(coordinate,resolution,epsg,params){
  return this.getOLLayer().getSource().getGetFeatureInfoUrl(coordinate,resolution,epsg,params);
};

proto.getLayerConfigs = function(){
  return this.layers;
};

proto.addLayer = function(layer){
  this.layers.push(layer);
};

proto.toggleLayer = function(layer){
  _.forEach(this.layers,function(_layer){
    if (_layer.id == layer.id){
      _layer.visible = layer.visible;
    }
  });
  this._updateLayers();
};
  
proto.update = function(mapState, extraParams) {
  this._updateLayers(mapState, extraParams);
};

proto.isVisible = function(){
  return this._getVisibleLayers().length > 0;
};

proto.getQueryUrl = function(){
  var layer = this.layers[0];
  if (layer.infourl && layer.infourl != '') {
    return layer.infourl;
  }
  return this.config.url;
};

proto.getQueryableLayers = function(){ 
  return _.filter(this.layers,function(layer){
    return layer.isQueryable();
  });
};

proto._getVisibleLayers = function(mapState){
  var self = this;
  var visibleLayers = [];
  _.forEach(this.layers,function(layer){
    var resolutionBasedVisibility = layer.state.maxresolution ? (layer.state.maxresolution && layer.state.maxresolution > mapState.resolution) : true;
    if (layer.state.visible && resolutionBasedVisibility) {
      visibleLayers.push(layer);
    }    
  });
  return visibleLayers;
};

proto._makeOlLayer = function(withLayers){
  var self = this;
  var wmsConfig = {
    url: this.config.url,
    id: this.config.id
  };
  
  if (withLayers) {
    wmsConfig.layers = _.map(this.layers,function(layer){
      return layer.getWMSLayerName();
    });
  }
  
  var representativeLayer = this.layers[0]; //BRUTTO, DEVO PRENDERE UN LAYER A CASO (IL PRIMO) PER VEDERE SE PUNTA AD UN SOURCE DIVERSO (dovrebbe accadere solo per i layer singoli, WMS esterni)
  
  if (representativeLayer.state.source && representativeLayer.state.source.type == 'wms' && representativeLayer.state.source.url){
    wmsConfig.url = representativeLayer.state.source.url;
  }
  
  var olLayer = new RasterLayers.WMSLayer(wmsConfig,this.extraParams);
  
  olLayer.getSource().on('imageloadstart', function() {
        self.emit("loadstart");
      });
  olLayer.getSource().on('imageloadend', function() {
      self.emit("loadend");
  });
  
  return olLayer
};

proto.checkLayerDisabled = function(layer,resolution) {
  var scale = geo.resToScale(resolution);
  var enabled = true;
  if (layer.state.maxresolution){
    enabled = enabled && (layer.state.maxresolution > resolution);
  }
  if (layer.state.minresolution){
    enabled = enabled && (layer.state.minresolution < resolution);
  }
  if (layer.state.minscale) {
    enabled = enabled && (layer.state.minscale > scale);
  }
  if (layer.state.maxscale) {
    enabled = enabled && (layer.state.maxscale < scale);
  }
  layer.state.disabled = !enabled;
};

proto.checkLayersDisabled = function(resolution){
  var self = this;
  _.forEach(this.layers,function(layer){
    self.checkLayerDisabled(layer,resolution);
  });
};

proto._updateLayers = function(mapState,extraParams){
  this.checkLayersDisabled(mapState.resolution);
  var visibleLayers = this._getVisibleLayers(mapState);
  if (visibleLayers.length > 0) {
    var params = {
      LAYERS: _.join(_.map(visibleLayers, function(layer) {
        return layer.getWMSLayerName();
      }),',')
    };
    if (extraParams) {
      params = _.assign(params,extraParams);
    }
    this._olLayer.setVisible(true);
    this._olLayer.getSource().updateParams(params);
  }
  else {
    this._olLayer.setVisible(false);
  }
};

module.exports = WMSLayer;
