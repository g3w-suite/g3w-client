/**
 * core/geometry/geometry::isMultiGeometry@v3.4
 */
export function isMultiGeometry(geometryType) {
  return [
    'MultiPoint',
    'MultiPointZ',
    'MutliPointM',
    'MultiPointZM',
    'MultiPoint25D',
    'MultiLineString',
    'MultiLineStringZ',
    'MultiLineStringM',
    'MultiLineStringZM',
    'MultiLineString25D',
    'MultiLine',
    'MultiLineZ',
    'MultiLineM',
    'MultiLineZM',
    'MultiLine25D',
    'MultiPolygon',
    'MultiPolygonZ',
    'MultiPolygonM',
    'MultiPolygonZM',
    'MultiPolygon25D',
  ].includes(geometryType);
}