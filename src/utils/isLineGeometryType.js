import { getAllLineGeometryTypes } from 'utils/getAllLineGeometryTypes';

/**
 * core/geometry/geometry::isLineGeometryType@v3.4
 */
export function isLineGeometryType(geometryType) {
  return -1 !== getAllLineGeometryTypes().indexOf(geometryType);
}