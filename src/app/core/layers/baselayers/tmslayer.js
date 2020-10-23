const {base, inherit} = require('core/utils/utils');
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
  const {url, attributions, minZoom, maxZoom, crs} = this.config;
  const projection = this.getProjectionFromCrs(crs);
  const olLayer = BasesLayers.TMS.get({
    url,
    minZoom,
    maxZoom,
    attributions,
    projection
  });
  return olLayer
};


module.exports = TMSLayer;
