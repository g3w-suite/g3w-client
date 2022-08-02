const {inherit, base} = require('core/utils/utils');
const BaseLayer = require('core/layers/baselayers/baselayer');
const BasesLayers = require('g3w-ol/layers/bases');

function OSMLayer(config={}, options={}){
  base(this, config, options);
}

inherit(OSMLayer, BaseLayer);

const proto = OSMLayer.prototype;

proto._makeOlLayer = function() {
  const olLayer = BasesLayers.OSM.get({
    id: this.config.name,
    title: this.config.title,
    url: this.config.url
  });
  return olLayer
};


module.exports = OSMLayer;
