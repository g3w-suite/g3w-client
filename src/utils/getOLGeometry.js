import { GEOMETRY_TYPES as GeometryTypes } from 'app/constant';

/**
 * core/geometry/geometry::getOLGeometry@v3.4
 */
export function getOLGeometry(geometryType) {

  switch (geometryType) {

    case GeometryTypes.LINESTRINGZ:
    case GeometryTypes.LINESTRINGM:
    case GeometryTypes.LINESTRINGZM:
    case GeometryTypes.LINESTRING25D:
    case GeometryTypes.LINE:
    case GeometryTypes.LINEZ:
    case GeometryTypes.LINEM:
    case GeometryTypes.LINEZM:
    case GeometryTypes.LINE25D:
      return 'LineString';

    case GeometryTypes.MULTILINESTRINGZ:
    case GeometryTypes.MULTILINESTRINGM:
    case GeometryTypes.MULTILINESTRINGZM:
    case GeometryTypes.MULTILINESTRING25D:
    case GeometryTypes.MULTILINE:
    case GeometryTypes.MULTILINEZ:
    case GeometryTypes.MULTILINEM:
    case GeometryTypes.MULTILINEZM:
    case GeometryTypes.MULTILINE25D:
      return 'MultiLineString';

    case GeometryTypes.POINTZ:
    case GeometryTypes.POINTM:
    case GeometryTypes.POINTZM:
    case GeometryTypes.POINT25D:
      return 'Point';

    case GeometryTypes.MULTIPOINTZ:
    case GeometryTypes.MULTIPOINTM:
    case GeometryTypes.MULTIPOINTZM:
    case GeometryTypes.MULTIPOINT25D:
      return 'MultiPoint';

    case GeometryTypes.POLYGONZ:
    case GeometryTypes.POLYGONM:
    case GeometryTypes.POLYGONZM:
    case GeometryTypes.POLYGON25D:
      return 'Polygon';

    case GeometryTypes.MULTIPOLYGONZ:
    case GeometryTypes.MULTIPOLYGONM:
    case GeometryTypes.MULTIPOLYGONZM:
    case GeometryTypes.MULTIPOLYGON25D:
      return 'MultiPolygon';

    default:
      console.warn('invalid geometry type: ', geometryType);
      return geometryType;

  }
};