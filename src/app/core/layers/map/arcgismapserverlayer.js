const { inherit, base } = require('core/utils/utils');
const RasterLayers = require('g3w-ol/layers/rasters');
const WMSLAYER = require('./wmslayer');

function ARCGISMAPSERVERLayer(options = {}, extraParams = {}) {
  base(this, options, extraParams);
}

inherit(ARCGISMAPSERVERLayer, WMSLAYER);

const proto = ARCGISMAPSERVERLayer.prototype;

proto._makeOlLayer = function () {
  const config = {
    url: this.config.url,
    id: this.config.id,
    projection: this.config.projection,
    format: this.config.format,
  };
  const olLayer = new RasterLayers.TiledArgisMapServer(config);
  olLayer.getSource().on('imageloadstart', () => {
    this.emit('loadstart');
  });
  olLayer.getSource().on('imageloadend', () => {
    this.emit('loadend');
  });

  olLayer.getSource().on('imageloaderror', () => {
    this.emit('loaderror');
  });
  return olLayer;
};

module.exports = ARCGISMAPSERVERLayer;
