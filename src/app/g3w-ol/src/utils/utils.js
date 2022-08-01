const OGC_PIXEL_WIDTH = 0.28;

const INCHES_PER_UNIT = {
  m: 39.37, //
  degrees: 4374754
};

//const DOTS_PER_INCH = ol.has.DEVICE_PIXEL_RATIO * 96; //DPI96
const DOTS_PER_INCH = 96; //DPI96

const utils = {
  getExtentForViewAndSize: function(center, resolution, rotation, size) {
    const dx = resolution * size[0] / 2;
    const dy = resolution * size[1] / 2;
    const cosRotation = Math.cos(rotation);
    const sinRotation = Math.sin(rotation);
    const xCos = dx * cosRotation;
    const xSin = dx * sinRotation;
    const yCos = dy * cosRotation;
    const ySin = dy * sinRotation;
    const x = center[0];
    const y = center[1];
    const x0 = x - xCos + ySin;
    const x1 = x - xCos - ySin;
    const x2 = x + xCos - ySin;
    const x3 = x + xCos + ySin;
    const y0 = y - xSin - yCos;
    const y1 = y - xSin + yCos;
    const y2 = y + xSin + yCos;
    const y3 = y + xSin - yCos;
    //return [Math.min(y0, y1, y2, y3),Math.min(x0, x1, x2, x3), Math.max(y0, y1, y2, y3), Math.max(x0, x1, x2, x3)]
    return [Math.min(x0, x1, x2, x3), Math.min(y0, y1, y2, y3), Math.max(x0, x1, x2, x3), Math.max(y0, y1, y2, y3)]
  },
  // function that create a polygon vector layer from bbox
  createPolygonLayerFromBBox: function(bbox) {
    const polygonFeature = new ol.Feature(new ol.geom.Polygon.fromExtent(bbox));
    const vectorSource = new ol.source.Vector({
      features: [polygonFeature]
    });
    const polygonLayer = new ol.layer.Vector({
      source: vectorSource
    });
    return polygonLayer;
  },
  reverseGeometry: function(geometry) {
    const reverseCoordinates = (coordinates) => {
      coordinates.find((coordinate) => {
        if (Array.isArray(coordinate)) {
          reverseCoordinates(coordinate)
        } else {
          const [y, x] = coordinates;
          coordinates[0] = x;
          coordinates[1] = y;
          return true
        }
      })
    };
    let coordinates = geometry.getCoordinates();
    reverseCoordinates(coordinates);
    geometry.setCoordinates(coordinates);
    return geometry
  },
  getScaleFromResolution: function(resolution, units="m") {
    return Math.round(resolution * INCHES_PER_UNIT[units] * DOTS_PER_INCH);
  },
  getResolutionFromScale: function(scale, units="m") {
    const normScale = (scale >= 1.0) ? (1.0 / scale) : scale; // just to prevent that scale is passed as 1:10000 or 0.0001
    return  1 / (normScale * INCHES_PER_UNIT[units] * DOTS_PER_INCH);
  },
  getDPI() {
    return DOTS_PER_INCH;
  },
  getMetersFromDegrees(degrees) {
    return degrees * ol.proj.Units.METERS_PER_UNIT.degrees;
  }
};

module.exports = utils;
