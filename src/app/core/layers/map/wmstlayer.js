import ApplicationState from 'store/application-state';

const { base, inherit } = require('core/utils/utils');
const WMSLayer = require('core/layers/map/wmslayer');
const RasterLayers = require('g3w-ol/layers/rasters');

function WMSTLayer(options={}, extraParams={}, method='GET') {
  this.LAYERTYPE = {
    LAYER: 'layer',
    MULTILAYER: 'multilayer'
  };
  this.extraParams = extraParams;
  this._method = method;
  base(this, options);
}

inherit(WMSTLayer, WMSLayer);

const proto = WMSTLayer.prototype;

proto._makeOlLayer = function(withLayers) {
  const wmsConfig = {
    url: this.config.url,
    id: this.config.id,
    projection: this.config.projection,
    iframe_internal: this.iframe_internal,
    layers: this.layers
  };
  if (withLayers) wmsConfig.layers = this.layers.map(layer => layer.getWMSLayerName());
  const representativeLayer = this.layers[0];
  if (representativeLayer && representativeLayer.getWmsUrl) wmsConfig.url = representativeLayer.getWmsUrl();
  const olLayer = new RasterLayers.TiledWMSLayer(wmsConfig, this.extraParams, this._method);
  olLayer.getSource().on('tileloadstart', () => this.emit("loadstart"));
  olLayer.getSource().on('tileloadend', () => this.emit("loadend"));
  olLayer.getSource().on('tileloaderror', ()=> this.emit("loaderror"));
  return olLayer
};

module.exports = WMSTLayer;
