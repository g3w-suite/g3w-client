const TYPES = [
  'MultiLineString', 'MultiLineStringZ', 'MultiLineStringM', 'MultiLineStringZM', 'MultiLineString25D',
       'LineString',      'LineStringZ',      'LineStringM',      'LineStringZM',      'LineString25D',
        'MultiLine',       'MultiLineZ',       'MultiLineM',       'MultiLineZM',       'MultiLine25D',
             'Line',            'LineZ',            'LineM',            'LineZM',            'Line25D',
];

export function isLineGeometryType(geometryType) {
  return TYPES.includes(geometryType);
}