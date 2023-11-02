const { inherit, base } = require('utils');
const VectorLayer = require('core/layers/map/vectorlayer');

function GeojsonLayer(options = {}) {
  const provider = options.provider;
  this.setProvider(provider);
  base(this, options);
  this.getFeatures({
    url: options.url,
    mapProjection: this.mapProjection
  });
}

inherit(GeojsonLayer, VectorLayer);


module.exports = GeojsonLayer;
