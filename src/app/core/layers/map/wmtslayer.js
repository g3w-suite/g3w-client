const {base, inherit } = require('core/utils/utils');
const WMSLayer = require('./wmslayer');
const RasterLayers = require('g3w-ol/src/layers/rasters');

function WMSTLayer(options={}, extraParams={}, method='GET') {
  this.LAYERTYPE = {
    LAYER: 'layer',
    MULTILAYER: 'multilayer'
  };
  this.extraParams = extraParams;
  this._method = method;
  base(this,options);
}

inherit(WMSTLayer, WMSLayer);

const proto = WMSTLayer.prototype;

/**
 * Create olLayer
 */
proto._makeOlLayer = function() {
  const wmsConfig = {
    url: this.config.url,
    id: this.config.id,
    projection: this.config.projection
  };

  const olLayer = new RasterLayers.WMSTLayer(wmsConfig, this.extraParams, this._method);

  olLayer.getSource().on('tileloadstart', () => {
    this.emit("loadstart");
  });
  olLayer.getSource().on('tileloadend', () => {
    this.emit("loadend");
  });

  olLayer.getSource().on('tileloaderror', ()=> {
    this.emit("loaderror");
  });

  return olLayer
};

module.exports = WMSTLayer;
