const TYPES = [
  'MultiPoint', 'MultiPointZ', 'MutliPointM', 'MultiPointZM', 'MultiPoint25D',
  'Point',           'PointZ',      'PointM',      'PointZM',      'Point25D',
];

export function isPointGeometryType(geometryType) {
  return TYPES.includes(geometryType);
}