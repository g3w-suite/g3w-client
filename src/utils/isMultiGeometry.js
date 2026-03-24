const TYPES = [
  'MultiLineString', 'MultiLineStringZ', 'MultiLineStringM', 'MultiLineStringZM', 'MultiLineString25D',
     'MultiPolygon',     'MultiPolygonZ',    'MultiPolygonM',    'MultiPolygonZM',   'MultiPolygon25D',
       'MultiPoint',       'MultiPointZ',      'MutliPointM',      'MultiPointZM',     'MultiPoint25D',
        'MultiLine',        'MultiLineZ',       'MultiLineM',       'MultiLineZM',      'MultiLine25D',
];

export function isMultiGeometry(geometryType) {
  return TYPES.includes(geometryType);
}