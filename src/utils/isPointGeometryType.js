/**
 * core/geometry/geometry::isPointGeometryType@v3.4
 * core/geometry/geometry::getAllPointGeometryTypes@v3.4
 */
export function isPointGeometryType(geometryType) {
  return [
    'Point',
    'PointZ',
    'PointM',
    'PointZM',
    'Point25D',
    'MultiPoint',
    'MultiPointZ',
    'MutliPointM',
    'MultiPointZM',
    'MultiPoint25D',
  ].includes(geometryType);
}