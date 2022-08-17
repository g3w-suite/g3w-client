import ApplicationState from 'core/applicationstate'
const {base, inherit} = require('core/utils/utils');
const BaseLayer = require('core/layers/baselayers/baselayer');
const BasesLayers = require('g3w-ol/layers/bases');

function BingLayer(config={}, options={}){
  base(this, config, options);
}

inherit(BingLayer, BaseLayer);

const proto = BingLayer.prototype;

proto._makeOlLayer = function(){
  let olLayer;
  const key = ApplicationState.keys.vendorkeys.bing;
  const subtype = this.config.source ? this.config.source.subtype : null;
  switch(subtype) {
    case 'streets':
      olLayer = BasesLayers.BING.get({
        imagerySet: 'Road',
        key
      });
      break;
    case 'aerial':
      olLayer = BasesLayers.BING.get({
        imagerySet: 'Aerial',
        key
      });
      break;
    case 'aerialwithlabels':
      olLayer = BasesLayers.BING.get({
        imagerySet: 'AerialWithLabels',
        key
      });
      break;
    default:
      olLayer = BasesLayers.BING.get({
        imagerySet: 'Aerial',
        key
      });
  }
  return olLayer
};

module.exports = BingLayer;
