import { GEOMETRY_TYPES as GeometryTypes } from 'app/constant';

/**
 * core/geometry/geometry::isMultiGeometry@v3.4
 */
export function isMultiGeometry(geometryType) {
  return -1 !== [
    GeometryTypes.MULTIPOINT,
    GeometryTypes.MULTIPOINTZ,
    GeometryTypes.MULTIPOINTZM,
    GeometryTypes.MULTIPOINTM,
    GeometryTypes.MULTIPOINT25D,
    GeometryTypes.MULTILINESTRING,
    GeometryTypes.MULTILINESTRINGZ,
    GeometryTypes.MULTILINESTRINGM,
    GeometryTypes.MULTILINESTRINGZM,
    GeometryTypes.MULTILINESTRING25D,
    GeometryTypes.MULTILINE,
    GeometryTypes.MULTILINEZ,
    GeometryTypes.MULTILINEM,
    GeometryTypes.MULTILINEZM,
    GeometryTypes.MULTILINE25D,
    GeometryTypes.MULTIPOLYGON,
    GeometryTypes.MULTIPOLYGONZ,
    GeometryTypes.MULTIPOLYGONM,
    GeometryTypes.MULTIPOLYGONZM,
    GeometryTypes.MULTIPOLYGON25D,
  ].indexOf(geometryType);
};