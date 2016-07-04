var Geometry = {};

Geometry.GeometryTypes = {
  POINT: "Point",
  MULTIPOINT: "MultiPoint",
  LINESTRING: "Line", // per seguire la definizione di QGis.GeometryType, che definisce Line invece di Linestring.
  MULTILINESTRING: "MultiLine",
  POLYGON: "Polygon",
  MULTIPOLYGON: "MultiPolygon",
  GEOMETRYCOLLECTION: "GeometryCollection"
};

Geometry.SupportedGeometryTypes = [
  Geometry.GeometryTypes.POINT,
  Geometry.GeometryTypes.MULTIPOINT,
  Geometry.GeometryTypes.LINESTRING,
  Geometry.GeometryTypes.MULTILINESTRING,
  Geometry.GeometryTypes.POLYGON,
  Geometry.GeometryTypes.MULTIPOLYGON
]

module.exports = Geometry;
