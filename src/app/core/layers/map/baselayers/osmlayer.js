const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const BaseLayer = require('core/layers/baselayers/baselayer');
const BasesLayers = require('g3w-ol/src/layers/bases');

function OSMLayer(options){
  base(this,options);
}

inherit(OSMLayer, BaseLayer);

const proto = OSMLayer.prototype;

proto._makeOlLayer = function() {
  const olLayer = BasesLayers.OSM;
  olLayer.getSource().on('imageloadstart', () => {
        this.emit("loadstart");
      });
  olLayer.getSource().on('imageloadend', () => {
      this.emit("loadend");
  });
  return olLayer
};


module.exports = OSMLayer;
