import WMSLAYER  from './wmslayer';
import RasterLayers from 'g3w-ol/src/layers/rasters';

class ARCGISMAPSERVERLayer extends WMSLAYER{
  constructor(options={}, extraParams={}) {
    super(options, extraParams);
  }

  _makeOlLayer() {
    const config = {
      url: this.config.url,
      id: this.config.id,
      projection: this.config.projection,
      format: this.config.format
    };
    const olLayer = new RasterLayers.TiledArgisMapServer(config);
    olLayer.getSource().on('imageloadstart', () => this.emit("loadstart"));
    olLayer.getSource().on('imageloadend', () => this.emit("loadend"));
    olLayer.getSource().on('imageloaderror', ()=> this.emit("loaderror"));
    return olLayer
  };
}


export default  ARCGISMAPSERVERLayer;
