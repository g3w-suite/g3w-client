const TYPES = [
  'MultiPolygon', 'MultiPolygonZ', 'MultiPolygonM', 'MultiPolygonZM', 'MultiPolygon25D',
       'Polygon',      'PolygonZ',      'PolygonM',      'PolygonZM',      'Polygon25D',
];

export function isPolygonGeometryType(geometryType) {
  return TYPES.includes(geometryType);
}