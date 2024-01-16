import { GEOMETRY_TYPES as GeometryTypes } from 'app/constant';

/**
 * core/geometry/geometry::getAllPointGeometryTypes@v3.4
 */
export function getAllPointGeometryTypes() {
  return [
    GeometryTypes.POINT,
    GeometryTypes.POINTZ,
    GeometryTypes.POINTM,
    GeometryTypes.POINTZM,
    GeometryTypes.POINT25D,
    GeometryTypes.MULTIPOINT,
    GeometryTypes.MULTIPOINTZ,
    GeometryTypes.MULTIPOINTM,
    GeometryTypes.MULTIPOINTZM,
    GeometryTypes.MULTIPOINT25D,
  ]
};