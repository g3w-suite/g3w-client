const Geometry = {};

Geometry.isMultiGeometry = function(geometryType){
  return [
    Geometry.GeometryTypes.MULTIPOLYGON,
    Geometry.GeometryTypes.MULTIPOINT,
    Geometry.GeometryTypes.MULTILINESTRING,
    Geometry.GeometryTypes.MULTILINE
  ].indexOf(geometryType) !== -1;
};

Geometry.GeometryTypes = {
  POINT: "Point",
  MULTIPOINT: "MultiPoint",
  LINESTRING: "LineString", // per seguire la definizione di QGis.GeometryType, che definisce Line invece di Linestring.
  LINE: "Line",
  MULTILINESTRING: "MultiLineString",
  MULTILINE:"MultiLine",
  POLYGON: "Polygon",
  MULTIPOLYGON: "MultiPolygon",
  GEOMETRYCOLLECTION: "GeometryCollection"
};

Geometry.SupportedGeometryTypes = [
  Geometry.GeometryTypes.POINT,
  Geometry.GeometryTypes.MULTIPOINT,
  Geometry.GeometryTypes.LINE,
  Geometry.GeometryTypes.LINESTRING,
  Geometry.GeometryTypes.MULTILINE,
  Geometry.GeometryTypes.LINESTRING,
  Geometry.GeometryTypes.POLYGON,
  Geometry.GeometryTypes.MULTIPOLYGON
];

module.exports = Geometry;
