import BaseLayer from 'core/layers/baselayers/baselayer';
import BasesLayers from 'g3w-ol/src/layers/bases';

class TMSLayer extends BaseLayer {
  constructor(config = {}, options = {}) {
    super(config, options);
    this.config = config;
  }

  _makeOlLayer() {
    // here configuration to create TMS
    const {
      url, attributions, minZoom, maxZoom, crs,
    } = this.config;
    const projection = this.getProjectionFromCrs(crs);
    const olLayer = BasesLayers.TMS.get({
      url,
      minZoom,
      maxZoom,
      attributions,
      projection,
    });
    return olLayer;
  }
}

export default TMSLayer;
