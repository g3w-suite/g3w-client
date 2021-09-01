const {base, inherit} = require('core/utils/utils');
const BaseLayer = require('core/layers/baselayers/baselayer');
const BasesLayers = require('g3w-ol/src/layers/bases');

function WMTSLayer(config={}, options={}) {
  this.config = config;
  base(this, config, options);
}

inherit(WMTSLayer, BaseLayer);

const proto = WMTSLayer.prototype;

proto._makeOlLayer = function() {
  //use this config to get params
  const {url, layer, attributions, matrixSet, format, style, requestEncoding, crs} = this.config;
  const projection = this.getProjectionFromCrs(crs);
  const olLayer = BasesLayers.WMTS.get({
    url,
    layer,
    attributions,
    format,
    projection,
    requestEncoding,
    matrixSet,
    style
  });
  return olLayer
};


module.exports = WMTSLayer;
