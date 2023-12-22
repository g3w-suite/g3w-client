const { inherit, base } = require('utils');
const WMSLAYER          = require('core/layers/map/wmslayer');
const RasterLayers      = require('g3w-ol/layers/rasters');

function ARCGISMAPSERVERLayer(options={}, extraParams={}) {
  base(this, options, extraParams);
}

inherit(ARCGISMAPSERVERLayer, WMSLAYER);

const proto = ARCGISMAPSERVERLayer.prototype;

proto._makeOlLayer = function() {
  const olLayer = new RasterLayers.TiledArgisMapServer({
    url:        this.config.url,
    id:         this.config.id,
    projection: this.config.projection,
    format:     this.config.format,
  });
  olLayer.getSource().on('imageloadstart', () => { this.emit('loadstart'); });
  olLayer.getSource().on('imageloadend',   () => { this.emit('loadend'); });
  olLayer.getSource().on('imageloaderror', () => { this.emit('loaderror'); });
  return olLayer
};

module.exports = ARCGISMAPSERVERLayer;