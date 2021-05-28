const Geometry = {};

Geometry.isMultiGeometry = function(geometryType){
  return [
    Geometry.GeometryTypes.MULTIPOINT,
    Geometry.GeometryTypes.MULTIPOINTZ,
    Geometry.GeometryTypes.MULTIPOINTZM,
    Geometry.GeometryTypes.MULTIPOINTM,
    Geometry.GeometryTypes.MULTIPOINT25D,
    Geometry.GeometryTypes.MULTILINESTRING,
    Geometry.GeometryTypes.MULTILINESTRINGZ,
    Geometry.GeometryTypes.MULTILINESTRINGM,
    Geometry.GeometryTypes.MULTILINESTRINGZM,
    Geometry.GeometryTypes.MULTILINESTRING25D,
    Geometry.GeometryTypes.MULTILINE,
    Geometry.GeometryTypes.MULTILINEZ,
    Geometry.GeometryTypes.MULTILINEM,
    Geometry.GeometryTypes.MULTILINEZM,
    Geometry.GeometryTypes.MULTILINE25D,
    Geometry.GeometryTypes.MULTIPOLYGON,
    Geometry.GeometryTypes.MULTIPOLYGONZ,
    Geometry.GeometryTypes.MULTIPOLYGONM,
    Geometry.GeometryTypes.MULTIPOLYGONZM,
    Geometry.GeometryTypes.MULTIPOLYGON25D
  ].indexOf(geometryType) !== -1;
};

Geometry.GeometryTypes = {
  POINT: "Point",
  POINTZ: "PointZ",
  POINTM: "PointM",
  POINTZM: "PointZM",
  POINT25D: "Point25D",
  MULTIPOINT: "MultiPoint",
  MULTIPOINTZ: "MultiPointZ",
  MULTIPOINTM: "MutliPointM",
  MULTIPOINTZM: "MultiPointZM",
  MULTIPOINT25D: "MultiPoint25D",
  LINESTRING: "LineString", // QGis definition .GeometryType, Line intead di Linestring.
  LINESTRINGZ: "LineStringZ",
  LINESTRINGM: "LineStringM",
  LINESTRINGZM: "LineStringZM",
  LINESTRING25D: "LineString25D",
  LINE: "Line",
  LINEZ: "LineZ",
  LINEM: "LineM",
  LINEZM: "LineZM",
  LINE25D: "Line25D",
  MULTILINESTRING: "MultiLineString",
  MULTILINESTRINGZ: "MultiLineStringZ",
  MULTILINESTRINGM: "MultiLineStringM",
  MULTILINESTRINGZM: "MultiLineStringZM",
  MULTILINESTRING25D: "MultiLineString25D",
  MULTILINE:"MultiLine",
  MULTILINEZ:"MultiLineZ",
  MULTILINEM:"MultiLineM",
  MULTILINEZM:"MultiLineZM",
  MULTILINE25D:"MultiLine25D",
  POLYGON: "Polygon",
  POLYGONZ: "PolygonZ",
  POLYGONM: "PolygonM",
  POLYGONZM: "PolygonZM",
  POLYGON25D: "Polygon25D",
  MULTIPOLYGON: "MultiPolygon",
  MULTIPOLYGONZ: "MultiPolygonZ",
  MULTIPOLYGONM: "MultiPolygonM",
  MULTIPOLYGONZM: "MultiPolygonZM",
  MULTIPOLYGON25D: "MultiPolygon25D",
  GEOMETRYCOLLECTION: "GeometryCollection",
  GEOMETRYCOLLECTIONZ: "GeometryCollectionZ",
  GEOMETRYCOLLECTIONM: "GeometryCollectionM",
  GEOMETRYCOLLECTIONZM: "GeometryCollectionZM",
  GEOMETRYCOLLECTION25D: "GeometryCollection25D"
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
