import { GEOMETRY_TYPES } from 'app/constant';

/**
 * core/geometry/geometry::getAllPointGeometryTypes@v3.4
 */
export function getAllPointGeometryTypes() {
  return [
    GEOMETRY_TYPES.POINT,
    GEOMETRY_TYPES.POINTZ,
    GEOMETRY_TYPES.POINTM,
    GEOMETRY_TYPES.POINTZM,
    GEOMETRY_TYPES.POINT25D,
    GEOMETRY_TYPES.MULTIPOINT,
    GEOMETRY_TYPES.MULTIPOINTZ,
    GEOMETRY_TYPES.MULTIPOINTM,
    GEOMETRY_TYPES.MULTIPOINTZM,
    GEOMETRY_TYPES.MULTIPOINT25D,
  ]
}