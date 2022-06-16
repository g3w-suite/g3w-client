import BaseLayer from 'core/layers/baselayers/baselayer';
import BasesLayers from 'g3w-ol/src/layers/bases';

class OSMLayer extends BaseLayer {
  constructor(config = {}, options = {}) {
    super(config, options);
  }

  _makeOlLayer() {
    const olLayer = BasesLayers.OSM;
    olLayer.getSource().on('imageloadstart', () => this.fire('loadstart'));
    olLayer.getSource().on('imageloadend', () => this.fire('loadend'));
    return olLayer;
  }
}

export default OSMLayer;
