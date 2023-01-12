const { base, inherit } = require('core/utils/utils');
const BaseLayer = require('core/layers/baselayers/baselayer');
const BasesLayers = require('g3w-ol/layers/bases');

function BingLayer(options){
  base(this,options);
}

inherit(BingLayer, BaseLayer);

const proto = BingLayer.prototype;

proto._makeOlLayer = function(){
  let olLayer;
  const subtype = this.config.source ? this.config.source.subtype : null;
  switch(subtype) {
    case 'streets':
      olLayer = BasesLayers.BING.Road;
      break;
    case 'aerial':
      olLayer = BasesLayers.BING.Aerial;
      break;
    case 'aerialwithlabels':
      olLayer = BasesLayers.BING.AerialWithLabels;
      break;
    default:
      olLayer = BasesLayers.BING.Aerial;
      break;
  }
  olLayer.getSource().on('imageloadstart', () => {
    this.emit("loadstart");
  });
  olLayer.getSource().on('imageloadend', () => {
    this.emit("loadend");
  });
  return olLayer
};


module.exports = BingLayer;
