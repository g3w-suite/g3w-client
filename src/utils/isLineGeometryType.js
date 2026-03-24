/**
 * core/geometry/geometry::isLineGeometryType@v3.4
 * core/geometry/geometry::getAllLineGeometryTypes@v3.4
 */
export function isLineGeometryType(geometryType) {
  return [
    'LineString',
    'LineStringZ',
    'LineStringM',
    'LineStringZM',
    'LineString25D',
    'MultiLineString',
    'MultiLineStringZ',
    'MultiLineStringM',
    'MultiLineStringZM',
    'MultiLineString25D',
    'Line',
    'LineZ',
    'LineM',
    'LineZM',
    'Line25D',
    'MultiLine',
    'MultiLineZ',
    'MultiLineM',
    'MultiLineZM',
    'MultiLine25D',
  ].includes(geometryType);
}