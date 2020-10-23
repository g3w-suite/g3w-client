const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const BaseLayer = require('core/layers/baselayers/baselayer');
const BasesLayers = require('g3w-ol/src/layers/bases');

function ARCGISMAPSERVERLayer(config={}, options={}) {
  this.config = config;
  base(this, config, options);
}

inherit(ARCGISMAPSERVERLayer, BaseLayer);

const proto = ARCGISMAPSERVERLayer.prototype;

proto._makeOlLayer = function() {
  // here configuration to create TMS
  const {url, attributions, crs} = this.config;
  const projection = this.getProjectionFromCrs(crs);
  const olLayer = BasesLayers.TMS.get({
    url,
    source_type: 'arcgismapserver',
    projection,
    attributions
  });
  return olLayer
};


module.exports = ARCGISMAPSERVERLayer;
