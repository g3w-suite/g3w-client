const { base, inherit } = require('utils');
const VectorLayer = require('core/layers/vectorlayer');
const GeojsonMapLayer = require('core/layers/map/geojson');

function GeojsonLayer(config, options) {
  base(this, config, options);
  this.config.style = config.style;
  this.setup(config)
}

inherit(GeojsonLayer, VectorLayer);

const proto = GeojsonLayer.prototype;

proto.getMapLayer = function() {
  if (!this._mapLayer) {
    this._mapLayer = new GeojsonMapLayer({
      url:        this.get('source').url,
      projection: this.getProjection().getCode(),
      id:         this.getId(),
      name:       this.getName(),
      style:      this.get('style'),
      provider:   this.getProvider('data')
    });
  }
  return this._mapLayer;
};


module.exports = GeojsonLayer;
