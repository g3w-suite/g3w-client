const { inherit, base } = require('utils');
const MapLayer          = require('core/layers/map/maplayer');
const RasterLayers      = require('g3w-ol/layers/rasters');

function XYZLayer(options, method="GET") {
  base(this, options);
  this._method = method;
}

inherit(XYZLayer, MapLayer);

const proto = XYZLayer.prototype;

proto.getOLLayer = function(){
  if (!this._olLayer) {
    this._olLayer = this._makeOlLayer();
  }
  return this._olLayer;
};

proto.getSource = function(){
  return this.getOLLayer().getSource();
};

proto.getLayerConfigs = function(){
  return this.layer;
};

proto.addLayer = function(layer){
  this.layer = layer;
  this.layers.push(layer);
  this.allLayers.push(layer);
};

proto.update = function(mapState, extraParams) {
  this._updateLayer(mapState, extraParams);
};

proto.isVisible = function(){
  return layer.state.visible;
};

proto._makeOlLayer = function(){
  this._olLayer = new RasterLayers.XYZLayer({
    url:             `${this.layer.getCacheUrl()}`,
    maxZoom:         20,
    extent:          this.config.extent,
    iframe_internal: this.iframe_internal,
    projection:      this.projection ? this.projection : this.layer.getProjection(),
    cache_provider:  this.config.cache_provider,
  }, this._method);

  this._olLayer.getSource().on('imageloadstart', () => this.emit('loadstart'));
  this._olLayer.getSource().on('imageloadend',   () => this.emit('loadend'));
  this._olLayer.getSource().on('imageloaderror', () => this.emit('loaderror'));

  return this._olLayer
};

proto._updateLayer = function(mapState = {}, extraParams = {}) {
  const {
    force = false
  } = extraParams;

  if (!force) {
    this.checkLayersDisabled(mapState.resolution, mapState.mapUnits)
  }

  this._olLayer.setVisible(this.layer.isVisible());
};

module.exports = XYZLayer;
