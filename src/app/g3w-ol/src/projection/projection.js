const GENERIC_GRID_EXTENT =  [0,0,8388608,8388608];
const GRID_EXTENT_3857 = ol.proj.get('EPSG:3857').getExtent();
const GENERIC_GRID_EXTENT_DEGREE = [-180,-90, 180, 90];
const CUSTOM_PROJECTIONS_EXTENT = {
  'EPSG:3876': [18835101.07,4367049.45,22702879.51,9383109.87],
  'EPSG:32733': GRID_EXTENT_3857
};

const Projection = function(options={}) {
  if (!options.crs) return null;
  const {epsg, proj4:proj4def, geographic=false, axisinverted=false} = options.crs; // new structure of information crs from server
  proj4def && proj4.defs(epsg, proj4def);
  this._axisOrientation = axisinverted ? 'neu' : 'enu';
  const degrees = geographic;
  ol.proj.Projection.call(this, {
    code: epsg,
    extent: options.extent ? options.extent : degrees ? GENERIC_GRID_EXTENT_DEGREE: CUSTOM_PROJECTIONS_EXTENT[epsg] || GENERIC_GRID_EXTENT,
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
