import { BING_API_KEY } from '/config/keys';
import ApplicationState from 'core/applicationstate'
import  BaseLayer from 'core/layers/baselayers/baselayer';
import BasesLayers  from '/g3w-ol/src/layers/bases';

class BingLayer extends BaseLayer {
  constructor(config={}, options={}){
    super(config, options);
  }
  makeOlLayer(){
    let olLayer;
    const key = ApplicationState.keys.vendorkeys.bing || BING_API_KEY;
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
}

export default  BingLayer;
