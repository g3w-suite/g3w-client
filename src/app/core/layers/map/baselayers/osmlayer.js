import BaseLayer  from 'core/layers/baselayers/baselayer';
import BasesLayers  from 'g3w-ol/src/layers/bases';

class OSMLayer extends BaseLayer{
  constructor(options={}){
    super(options);
  }

  _makeOlLayer() {
    const olLayer = BasesLayers.OSM;
    olLayer.getSource().on('imageloadstart', () => this.emit("loadstart"));
    olLayer.getSource().on('imageloadend', () => this.emit("loadend"));
    return olLayer
  };
}

export default  OSMLayer;
