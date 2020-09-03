const GENERIC_GRID_EXTENT =  [0,0,8388608,8388608];
const GENERIC_GRID_EXTENT_DEGREE =  [-172.54,23.81,-47.74, 86.46];

const Projection = function(options={}) {
  if (!options.crs) return null;
  options.proj4def && proj4.defs(options.crs, options.proj4def);
  this._axisOrientation = options.axisOrientation || 'enu';
  let degrees = false;
  if (options.proj4def) {
    degrees = options.proj4def.indexOf('+units=m') === -1;
    const proj4def = proj4.defs(options.crs);
    if ( proj4def.axis !== undefined) this._axisOrientation = proj4def.axis;
    if (options.crs === 'EPSG:3045' || options.crs === 'EPSG:6708' || options.crs === 'EPSG:4269') this._axisOrientation = 'neu';
  };
  ol.proj.Projection.call(this, {
    code: options.crs,
    extent: options.extent ? options.extent : degrees ? GENERIC_GRID_EXTENT_DEGREE: GENERIC_GRID_EXTENT,
    axisOrientation: this._axisOrientation,
    units: degrees ? 'degrees' : 'm'
  });
};

ol.inherits(Projection, ol.proj.Projection);

const proto = Projection.prototype;

proto.getAxisOrientation = function() {
  return this._axisOrientation;
};

proto.isInvertedAxisOrientation = function() {
  return this._axisOrientation === 'neu';
};

proto.getOlProjection = function() {};

module.exports = Projection;
