const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const BaseLayer = require('core/layers/baselayers/baselayer');
const BasesLayers = require('g3w-ol/src/layers/bases');

function TMSLayer(config={}, options={}) {
  this.config = config;
  base(this, config, options);
}

inherit(TMSLayer, BaseLayer);

const proto = TMSLayer.prototype;

proto._makeOlLayer = function() {
  // here configuration to create TMS
  const {url, attributions, minZoom, maxZoom} = this.config;
  const olLayer = BasesLayers.TMS.get({
    url,
    minZoom,
    maxZoom,
    attributions,
    projection: `EPSG:${this.config.crs}`
  });
  return olLayer
};


module.exports = TMSLayer;
