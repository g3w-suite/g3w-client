const inherit = require('core/utils/utils').inherit;
const base = require('core/utils//utils').base;
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
