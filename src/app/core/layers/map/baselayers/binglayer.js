import BaseLayer from 'core/layers/baselayers/baselayer';
import BasesLayers from 'g3w-ol/layers/bases';

class BingLayer extends BaseLayer {
  // constructor(options = {}) {
  //   super(options);
  // }

  _makeOlLayer() {
    let olLayer;
    const subtype = this.config.source ? this.config.source.subtype : null;
    switch (subtype) {
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
      this.fire('loadstart');
    });
    olLayer.getSource().on('imageloadend', () => {
      this.fire('loadend');
    });
    return olLayer;
  }
}

export default BingLayer;
