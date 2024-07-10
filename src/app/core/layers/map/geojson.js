const VectorLayer = require('core/layers/map/vectorlayer');

module.exports = class GeojsonLayer extends VectorLayer {

  constructor(options = {}) {
    super(options);
    this.setProvider(options.provider);
    this.getFeatures({ url: options.url, mapProjection: this.mapProjection });
  }

};