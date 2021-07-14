const Geometry = {
  GeometryTypes: {
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
  },
  addZValueToOLFeatureGeometry({feature, geometryType}={}){
    const geometry = feature.getGeometry();
    geometryType = geometryType || geometry.getType();
    const originalFeatureCoordinates = geometry.getCoordinates();
    switch (geometryType){
      //POINT //[x,y]
      case this.GeometryTypes.POINTZ:
      case this.GeometryTypes.POINTM:
      case this.GeometryTypes.POINTZM:
      case this.GeometryTypes.POINT25D:
        originalFeatureCoordinates.push(0);
        feature.getGeometry().setCoordinates(originalFeatureCoordinates);
        break;
      //MULTIPOINT [[x1, y1], [x2, y2]]
      case this.GeometryTypes.MULTIPOINTZ:
      case this.GeometryTypes.MULTIPOINTM:
      case this.GeometryTypes.MULTIPOINTZM:
      case this.GeometryTypes.MULTIPOINT25D:
      //LINE [[x1, y1], [x2, y2]]
      case this.GeometryTypes.LINESTRINGZ:
      case this.GeometryTypes.LINESTRINGM:
      case this.GeometryTypes.LINESTRINGZM:
      case this.GeometryTypes.LINESTRING25D:
      case this.GeometryTypes.LINEZ:
      case this.GeometryTypes.LINEM:
      case this.GeometryTypes.LINEZM:
      case this.GeometryTypes.LINE25D:
        originalFeatureCoordinates.forEach(coordinates => coordinates.push(0));
        feature.getGeometry().setCoordinates(originalFeatureCoordinates);
        break;
      //MULTILINE [
      // [[x1, y1],[x2, y2]],
      // [[x3, y3], [x4, y4]]
      // ]
      case this.GeometryTypes.MULTILINESTRINGZ:
      case this.GeometryTypes.MULTILINESTRINGM:
      case this.GeometryTypes.MULTILINESTRINGZM:
      case this.GeometryTypes.MULTILINESTRING25D:
      case this.GeometryTypes.MULTILINEZ:
      case this.GeometryTypes.MULTILINEM:
      case this.GeometryTypes.MULTILINEZM:
      case this.GeometryTypes.MULTILINE25D:
        originalFeatureCoordinates.forEach(singleLine => {
          singleLine.forEach(coordinates => coordinates.push(0))
        });
        feature.getGeometry().setCoordinates(originalFeatureCoordinates);
        break;
      //POLYGON [
      //[[x1, y1], [x2, y2], [x3, y3], [x1, y1]]
      // ]
      case this.GeometryTypes.POLYGONZ:
      case this.GeometryTypes.POLYGONM:
      case this.GeometryTypes.POLYGONZM:
      case this.GeometryTypes.POLYGON25D:
        originalFeatureCoordinates[0].forEach(coordinates => coordinates.push(0));
        feature.getGeometry().setCoordinates(originalFeatureCoordinates);
        break;
      //MULTIPOLYGON  [
      //       [ [100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0] ],
      //       [ [100.2, 0.2], [100.8, 0.2], [100.8, 0.8], [100.2, 0.8], [100.2, 0.2] ]
      //       ]
      case this.GeometryTypes.MULTIPOLYGONZ:
      case this.GeometryTypes.MULTIPOLYGONM:
      case this.GeometryTypes.MULTIPOLYGOZM:
      case this.GeometryTypes.MULTIPOLYGON25D:
        originalFeatureCoordinates.forEach(singlePolygon => {
          singlePolygon[0].forEach(coordinates => coordinates.push(0))
        });
        feature.getGeometry().setCoordinates(originalFeatureCoordinates);
        break;
    }
    return feature;
  },
  getOLGeometry(geometryType){
    switch (geometryType) {
      case this.GeometryTypes.LINESTRINGZ:
      case this.GeometryTypes.LINESTRINGM:
      case this.GeometryTypes.LINESTRINGZM:
      case this.GeometryTypes.LINESTRING25D:
      case this.GeometryTypes.LINE:
      case this.GeometryTypes.LINEZ:
      case this.GeometryTypes.LINEM:
      case this.GeometryTypes.LINEZM:
      case this.GeometryTypes.LINE25D:
        geometryType = 'LineString';
        break;
      case this.GeometryTypes.MULTILINESTRINGZ:
      case this.GeometryTypes.MULTILINESTRINGM:
      case this.GeometryTypes.MULTILINESTRINGZM:
      case this.GeometryTypes.MULTILINESTRING25D:
      case this.GeometryTypes.MULTILINE:
      case this.GeometryTypes.MULTILINEZ:
      case this.GeometryTypes.MULTILINEM:
      case this.GeometryTypes.MULTILINEZM:
      case this.GeometryTypes.MULTILINE25D:
        geometryType = 'MultiLineString';
        break;
      case this.GeometryTypes.POINTZ:
      case this.GeometryTypes.POINTM:
      case this.GeometryTypes.POINTZM:
      case this.GeometryTypes.POINT25D:
        geometryType = 'Point';
        break;
      case this.GeometryTypes.MULTIPOINTZ:
      case this.GeometryTypes.MULTIPOINTM:
      case this.GeometryTypes.MULTIPOINTZM:
      case this.GeometryTypes.MULTIPOINT25D:
        geometryType = 'MultiPoint';
        break;
      case this.GeometryTypes.POLYGONZ:
      case this.GeometryTypes.POLYGONM:
      case this.GeometryTypes.POLYGONZM:
      case this.GeometryTypes.POLYGON25D:
        geometryType = 'Polygon';
        break;
      case this.GeometryTypes.MULTIPOLYGONZ:
      case this.GeometryTypes.MULTIPOLYGONM:
      case this.GeometryTypes.MULTIPOLYGONZM:
      case this.GeometryTypes.MULTIPOLYGON25D:
        geometryType = 'MultiPolygon';
        break;
    }
    return geometryType;
  },
  isMultiGeometry(geometryType){
    return [
      this.GeometryTypes.MULTIPOINT,
      this.GeometryTypes.MULTIPOINTZ,
      this.GeometryTypes.MULTIPOINTZM,
      this.GeometryTypes.MULTIPOINTM,
      this.GeometryTypes.MULTIPOINT25D,
      this.GeometryTypes.MULTILINESTRING,
      this.GeometryTypes.MULTILINESTRINGZ,
      this.GeometryTypes.MULTILINESTRINGM,
      this.GeometryTypes.MULTILINESTRINGZM,
      this.GeometryTypes.MULTILINESTRING25D,
      this.GeometryTypes.MULTILINE,
      this.GeometryTypes.MULTILINEZ,
      this.GeometryTypes.MULTILINEM,
      this.GeometryTypes.MULTILINEZM,
      this.GeometryTypes.MULTILINE25D,
      this.GeometryTypes.MULTIPOLYGON,
      this.GeometryTypes.MULTIPOLYGONZ,
      this.GeometryTypes.MULTIPOLYGONM,
      this.GeometryTypes.MULTIPOLYGONZM,
      this.GeometryTypes.MULTIPOLYGON25D
    ].indexOf(geometryType) !== -1;
  },
  getAllPointGeometryTypes(){
    return [
      Geometry.GeometryTypes.POINT,
      Geometry.GeometryTypes.POINTZ,
      Geometry.GeometryTypes.POINTM,
      Geometry.GeometryTypes.POINTZM,
      Geometry.GeometryTypes.POINT25D,
      Geometry.GeometryTypes.MULTIPOINT,
      Geometry.GeometryTypes.MULTIPOINTZ,
      Geometry.GeometryTypes.MULTIPOINTM,
      Geometry.GeometryTypes.MULTIPOINTZM,
      Geometry.GeometryTypes.MULTIPOINT25D
    ]
  },
  isPointGeometryType(geometryType){
    return Geometry.getAllPointGeometryTypes().indexOf(geometryType) !== -1;
  },
  getAllLineGeometryTypes(){
    return [
      Geometry.GeometryTypes.LINESTRING,
      Geometry.GeometryTypes.LINESTRINGZ,
      Geometry.GeometryTypes.LINESTRINGM,
      Geometry.GeometryTypes.LINESTRINGZM,
      Geometry.GeometryTypes.LINESTRING25D,
      Geometry.GeometryTypes.MULTILINESTRING,
      Geometry.GeometryTypes.MULTILINESTRINGZ,
      Geometry.GeometryTypes.MULTILINESTRINGM,
      Geometry.GeometryTypes.MULTILINESTRINGZM,
      Geometry.GeometryTypes.MULTILINESTRING25D,
      Geometry.GeometryTypes.LINE,
      Geometry.GeometryTypes.LINEZ,
      Geometry.GeometryTypes.LINEM,
      Geometry.GeometryTypes.LINEZM,
      Geometry.GeometryTypes.LINE25D,
      Geometry.GeometryTypes.MULTILINE,
      Geometry.GeometryTypes.MULTILINEZ,
      Geometry.GeometryTypes.MULTILINEM,
      Geometry.GeometryTypes.MULTILINEZM,
      Geometry.GeometryTypes.MULTILINE25D]
  },
  isLineGeometryType(geometryType){
    return Geometry.getAllLineGeometryTypes().indexOf(geometryType) !== -1;
  },
  getAllPolygonGeometryTypes(){
    return [
      Geometry.GeometryTypes.POLYGON,
      Geometry.GeometryTypes.POLYGONZ,
      Geometry.GeometryTypes.POLYGONM,
      Geometry.GeometryTypes.POLYGONZM,
      Geometry.GeometryTypes.POLYGON25D,
      Geometry.GeometryTypes.MULTIPOLYGON,
      Geometry.GeometryTypes.MULTIPOLYGONZ,
      Geometry.GeometryTypes.MULTIPOLYGONM,
      Geometry.GeometryTypes.MULTIPOLYGONZM,
      Geometry.GeometryTypes.MULTIPOLYGON25D
    ]
  },
  isPolygonGeometryType(geometryType){
    return Geometry.getAllPolygonGeometryTypes().indexOf(geometryType) !== -1;
  }
};

module.exports = Geometry;
