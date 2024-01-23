import { getAllPolygonGeometryTypes } from 'utils/getAllPolygonGeometryTypes';

/**
 * core/geometry/geometry::isPolygonGeometryType@v3.4
 */
export function isPolygonGeometryType(geometryType) {
  return -1 !== getAllPolygonGeometryTypes().indexOf(geometryType);
}