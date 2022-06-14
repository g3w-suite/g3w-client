import VectorLayer from './vectorlayer';
import GeojsonMapLayer from './map/geojson';

class GeojsonLayer extends VectorLayer{
  constructor(config={}, options={}) {
    super(config, options);
    this.config.style = config.style;
    this.setup(config)
  }

  getMapLayer() {
    if (this._mapLayer) return this._mapLayer;
    const url = this.get('source').url;
    const name = this.getName();
    const id = this.getId();
    const style = this.get('style');
    const provider = this.getProvider('data');
    const options = {
      url,
      projection: this.getProjection().getCode(),
      id,
      name,
      style,
      provider
    };
    this._mapLayer = new GeojsonMapLayer(options);
    return this._mapLayer;
  };
}

export default  GeojsonLayer;
