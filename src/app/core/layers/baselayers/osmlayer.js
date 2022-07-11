import BaseLayer from 'core/layers/baselayers/baselayer';
import BasesLayers from 'g3w-ol/layers/bases';

class OSMLayer extends BaseLayer {
  // constructor(config = {}, options = {}) {
  //   super(config, options);
  // }

  _makeOlLayer() {
    const olLayer = BasesLayers.OSM.get({
      id: this.config.name,
      title: this.config.title,
      url: this.config.url,
    });
    return olLayer;
  }
}

export default OSMLayer;
