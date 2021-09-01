const {inherit, base} = require('core/utils/utils');
const VectorLayer = require('./vectorlayer');

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
