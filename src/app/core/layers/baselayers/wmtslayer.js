import BaseLayer  from 'core/layers/baselayers/baselayer';
import BasesLayers  from 'g3w-ol/src/layers/bases';

class WMTSLayer extends BaseLayer {
  constructor(config={}, options={}) {
    super(config, options);
    this.config = config;
  }

  _makeOlLayer() {
    //use this config to get params
    const {url, layer, attributions, matrixSet, format, style, requestEncoding, crs} = this.config;
    const projection = this.getProjectionFromCrs(crs);
    const olLayer = BasesLayers.WMTS.get({
      url,
      layer,
      attributions,
      format,
      projection,
      requestEncoding,
      matrixSet,
      style
    });
    return olLayer
  };
}

export default  WMTSLayer;
