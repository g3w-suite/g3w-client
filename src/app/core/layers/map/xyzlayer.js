const { inherit, base } = require('core/utils/utils');
const MapLayer = require('core/layers/map/maplayer');
const RasterLayers = require('g3w-ol/layers/rasters');

function XYZLayer(options, method="GET") {
  base(this, options);
  this._method = method;
}

inherit(XYZLayer, MapLayer);

const proto = XYZLayer.prototype;

proto.getOLLayer = function(){
  let olLayer = this._olLayer;
  if (!olLayer) olLayer = this._olLayer = this._makeOlLayer();
  return olLayer;
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
  const projection = this.projection ? this.projection : this.layer.getProjection();
  const layerOptions = {
    url: `${this.layer.getCacheUrl()}/{z}/{x}/{y}.png`,
    maxZoom: 20,
    extent: this.config.extent,
    iframe_internal: this.iframe_internal
  };

  layerOptions.projection = projection;
  this._olLayer = new RasterLayers.XYZLayer(layerOptions, this._method);

  this._olLayer.getSource().on('imageloadstart', () => {
    this.emit("loadstart");
  });
  this._olLayer.getSource().on('imageloadend', () => {
    this.emit("loadend");
  });
  this._olLayer.getSource().on('imageloaderror', () => {
    this.emit("loaderror");
  });
  return this._olLayer
};

proto._updateLayer = function(mapState={}, extraParams={}) {
  const {force=false} = extraParams;
  !force && this.checkLayersDisabled(mapState.resolution, mapState.mapUnits);
  this._olLayer.setVisible(this.layer.isVisible());
};

module.exports = XYZLayer;
