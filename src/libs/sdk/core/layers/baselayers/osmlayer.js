const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const BaseLayer = require('core/layers/baselayers/baselayer');
const BasesLayers = require('g3w-ol3/src/layers/bases');

function OSMLayer(config={}, options={}){
  base(this, config, options);
}

inherit(OSMLayer, BaseLayer);

const proto = OSMLayer.prototype;

proto._makeOlLayer = function() {
  const olLayer = BasesLayers.OSM;
  return olLayer
};


module.exports = OSMLayer;
