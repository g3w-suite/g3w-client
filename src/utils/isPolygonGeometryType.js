import { GEOMETRY_TYPES } from 'g3w-constants';

/**
 * core/geometry/geometry::isPolygonGeometryType@v3.4
 * core/geometry/geometry::getAllPolygonGeometryTypes@v3.4
 */
export function isPolygonGeometryType(geometryType) {
  return [
    GEOMETRY_TYPES.POLYGON,
    GEOMETRY_TYPES.POLYGONZ,
    GEOMETRY_TYPES.POLYGONM,
    GEOMETRY_TYPES.POLYGONZM,
    GEOMETRY_TYPES.POLYGON25D,
    GEOMETRY_TYPES.MULTIPOLYGON,
    GEOMETRY_TYPES.MULTIPOLYGONZ,
    GEOMETRY_TYPES.MULTIPOLYGONM,
    GEOMETRY_TYPES.MULTIPOLYGONZM,
    GEOMETRY_TYPES.MULTIPOLYGON25D,
  ].includes(geometryType);
}