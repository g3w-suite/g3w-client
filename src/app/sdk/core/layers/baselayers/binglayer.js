const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const BaseLayer = require('core/layers/baselayers/baselayer');
const BasesLayers = require('g3w-ol3/src/layers/bases');

function BingLayer(config={}, options={}){
  base(this, config, options);
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

  return olLayer
};



module.exports = BingLayer;
