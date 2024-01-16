import { GEOMETRY_TYPES as GeometryTypes } from 'app/constant';

export function coordinatesToGeometry(geometryType, coordinates) {

  switch (geometryType) {

    case GeometryTypes.POLYGON:
    case GeometryTypes.POLYGONZ:
    case GeometryTypes.POLYGONM:
    case GeometryTypes.POLYGONZM:
    case GeometryTypes.POLYGON25D:
      return new ol.geom.Polygon(coordinates);

    case GeometryTypes.MULTIPOLYGON:
    case GeometryTypes.MULTIPOLYGONZ:
    case GeometryTypes.MULTIPOLYGONM:
    case GeometryTypes.MULTIPOLYGONZM:
    case GeometryTypes.MULTIPOLYGON25D:
      return new ol.geom.MultiPolygon(coordinates);

    case GeometryTypes.LINESTRING:
    case GeometryTypes.LINESTRINGZ:
    case GeometryTypes.LINESTRINGM:
    case GeometryTypes.LINESTRINGZM:
    case GeometryTypes.LINESTRING25D:
    case GeometryTypes.LINE:
    case GeometryTypes.LINEZ:
    case GeometryTypes.LINEM:
    case GeometryTypes.LINEZM:
    case GeometryTypes.LINE25D:
      return new ol.geom.LineString(coordinates);

    case GeometryTypes.MULTILINE:
    case GeometryTypes.MULTILINEZ:
    case GeometryTypes.MULTILINEM:
    case GeometryTypes.MULTILINEZM:
    case GeometryTypes.MULTILINE25D:
    case GeometryTypes.MULTILINESTRING:
    case GeometryTypes.MULTILINESTRINGZ:
    case GeometryTypes.MULTILINESTRINGM:
    case GeometryTypes.MULTILINESTRINGZM:
    case GeometryTypes.MULTILINESTRING25D:
      return new ol.geom.MultiLineString(coordinates);

    case GeometryTypes.POINT:
    case GeometryTypes.POINTZ:
    case GeometryTypes.POINTM:
    case GeometryTypes.POINTZM:
    case GeometryTypes.POINT25D:
      return new ol.geom.Point(coordinates);

    case GeometryTypes.MULTIPOINT:
    case GeometryTypes.MULTIPOINTZ:
    case GeometryTypes.MULTIPOINTM:
    case GeometryTypes.MULTIPOINTZM:
    case GeometryTypes.MULTIPOINT25D:
      return new ol.geom.MultiPoint(coordinates);

    default:
      console.warn('invalid geometry type: ', geometryType);
      return new ol.geom.Point(coordinates);

  }
};