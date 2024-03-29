import { getAllPointGeometryTypes } from 'utils/getAllPointGeometryTypes';

/**
 * core/geometry/geometry::isPointGeometryType@v3.4
 */
export function isPointGeometryType(geometryType) {
  return -1 !== getAllPointGeometryTypes().indexOf(geometryType);
}