import BaseLayer from 'core/layers/baselayers/baselayer';
import BasesLayers from 'g3w-ol/src/layers/bases';

class WMSLayer extends BaseLayer {
  constructor(config = {}, options = {}) {
    super(config, options);
    this.config = config;
  }

  _makeOlLayer() {
    // use this config to get params
    const {
      url, layers, singleTile, attributions, crs, opacity,
    } = this.config;
    const projection = this.getProjectionFromCrs(crs);
    const olLayer = BasesLayers.WMS.get({
      url,
      layers,
      singleTile,
      attributions,
      projection,
      opacity,
    });
    return olLayer;
  }
}

export default WMSLayer;
