const {base, inherit} = require('core/utils/utils');
const VectorLayer = require('./vectorlayer');
const GeojsonMapLayer = require('./map/geojson');

function GeojsonLayer(config, options) {
  base(this, config, options);
  this.config.style = config.style;
  this.setup(config)
}

inherit(GeojsonLayer, VectorLayer);

const proto = GeojsonLayer.prototype;

proto.getMapLayer = function() {
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


module.exports = GeojsonLayer;
