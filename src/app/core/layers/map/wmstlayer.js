const { base, inherit } = require('utils');
const WMSLayer          = require('core/layers/map/wmslayer');
const RasterLayers      = require('g3w-ol/layers/rasters');

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
  const olLayer = new RasterLayers.TiledWMSLayer({
    url:             this.layers[0] && this.layers[0].getWmsUrl ? this.layers[0].getWmsUrl() : this.config.url,
    id:              this.config.id,
    projection:      this.config.projection,
    iframe_internal: this.iframe_internal,
    layers:          (withLayers) ? this.layers.map(layer => layer.getWMSLayerName()) : this.layers,
  }, this.extraParams, this._method);

  olLayer.getSource().on('tileloadstart', () => this.emit('loadstart'));
  olLayer.getSource().on('tileloadend',   () => this.emit('loadend'));
  olLayer.getSource().on('tileloaderror', () => this.emit('loaderror'));

  return olLayer
};

module.exports = WMSTLayer;
