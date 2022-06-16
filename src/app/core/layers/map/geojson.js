import VectorLayer from './vectorlayer';

class GeojsonLayer extends VectorLayer {
  constructor(options = {}) {
    super(options);
    const { provider } = options;
    this.setProvider(provider);
    this.getFeatures({
      url: options.url,
      mapProjection: this.mapProjection,
    });
  }
}

export default GeojsonLayer;
