/**
 * core/geometry/geometry::isPolygonGeometryType@v3.4
 * core/geometry/geometry::getAllPolygonGeometryTypes@v3.4
 */
export function isPolygonGeometryType(geometryType) {
  return [
    'Polygon',
    'PolygonZ',
    'PolygonM',
    'PolygonZM',
    'Polygon25D',
    'MultiPolygon',
    'MultiPolygonZ',
    'MultiPolygonM',
    'MultiPolygonZM',
    'MultiPolygon25D',
  ].includes(geometryType);
}