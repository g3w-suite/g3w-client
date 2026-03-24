const TYPES = [
  'MultiLineStringZ', 'MultiLineStringM', 'MultiLineStringZM', 'MultiLineString25D',
     'MultiPolygonZ',    'MultiPolygonM',    'MultiPolygonZM',    'MultiPolygon25D',
       'MultiPointZ',      'MutliPointM',      'MultiPointZM',      'MultiPoint25D',
       'LineStringZ',      'LineStringM',      'LineStringZM',      'LineString25D',
        'MultiLineZ',       'MultiLineM',       'MultiLineZM',       'MultiLine25D',
          'PolygonZ',         'PolygonM',         'PolygonZM',         'Polygon25D',
            'PointZ',           'PointM',          'PointZM',            'Point25D',
             'LineZ',            'LineM',            'LineZM',            'Line25D',
];

export function is3DGeometry(geometryType) {
  return TYPES.find(type3D => type3D === geometryType);
}