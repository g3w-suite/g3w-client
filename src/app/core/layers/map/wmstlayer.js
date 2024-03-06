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
    url:               ('mapproxy' === this.config.cache_provider) || !(this.layers[0] && this.layers[0].getWmsUrl) ? this.config.url : this.layers[0].getWmsUrl(),
    id:                this.config.id,
    projection:        this.config.projection,
    iframe_internal:   this.iframe_internal,
    layers:            (withLayers) ? this.layers.map(layer => layer.getWMSLayerName()) : this.layers,
    cache_provider:    this.config.cache_provider, /** @since 3.10.0 **/
    cache_type:        this.config.cache_type, /** @since 3.10.0  tms, wms**/
    cache_layer:       this.config.cache_layer,
    cache_extent:      this.config.cache_extent,
    cache_grid:        this.config.cache_grid,
    cache_grid_extent: this.config.cache_grid_extent,
  }, this.extraParams, this._method);
  olLayer.getSource().on('tileloadstart', () => this.emit('loadstart'));
  olLayer.getSource().on('tileloadend',   () => this.emit('loadend'));
  olLayer.getSource().on('tileloaderror', () => this.emit('loaderror'));

  return olLayer
};

module.exports = WMSTLayer;
