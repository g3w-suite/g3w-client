const Projection = function(options = {}) {
  if (!options.crs) { return null }
  // structure of information crs from server set on each layer and base layer
  const { epsg, proj4:proj4def, geographic = false, axisinverted = false, extent } = options.crs;
  if (proj4def) { proj4.defs(epsg, proj4def) }
  this._axisOrientation = axisinverted ? 'neu' : 'enu';
  ol.proj.Projection.call(this, {
    code: epsg,
    extent,
    axisOrientation: this._axisOrientation,
    units: geographic ? 'degrees' : 'm'
  });
};

ol.inherits(Projection, ol.proj.Projection);

const proto = Projection.prototype;

proto.getAxisOrientation = function() {
  return this._axisOrientation;
};

proto.isInvertedAxisOrientation = function() {
  return 'neu' === this._axisOrientation;
};

proto.getOlProjection = function() {};

module.exports = Projection;
