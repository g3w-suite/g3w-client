import RasterLayers from 'g3w-ol/src/layers/rasters';
import WMSLAYER from './wmslayer';

class ARCGISMAPSERVERLayer extends WMSLAYER {
  // constructor(options = {}, extraParams = {}) {
  //   super(options, extraParams);
  // }

  _makeOlLayer() {
    const config = {
      url: this.config.url,
      id: this.config.id,
      projection: this.config.projection,
      format: this.config.format,
    };
    const olLayer = new RasterLayers.TiledArgisMapServer(config);
    olLayer.getSource().on('imageloadstart', () => this.fire('loadstart'));
    olLayer.getSource().on('imageloadend', () => this.fire('loadend'));
    olLayer.getSource().on('imageloaderror', () => this.fire('loaderror'));
    return olLayer;
  }
}

export default ARCGISMAPSERVERLayer;
