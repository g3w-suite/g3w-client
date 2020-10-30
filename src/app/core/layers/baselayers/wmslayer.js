const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const BaseLayer = require('core/layers/baselayers/baselayer');
const BasesLayers = require('g3w-ol/src/layers/bases');

function WMSLayer(config={}, options={}) {
  this.config = config;
  base(this, config, options);
}

inherit(WMSLayer, BaseLayer);

const proto = WMSLayer.prototype;

proto._makeOlLayer = function() {
  //use this config to get params
  const {url, layers, singleTile, attributions, crs, opacity} = this.config;
  const projection = this.getProjectionFromCrs(crs);
  const olLayer = BasesLayers.WMS.get({
    url,
    layers,
    singleTile,
    attributions,
    projection,
    opacity
  });
  return olLayer
};

module.exports = WMSLayer;
