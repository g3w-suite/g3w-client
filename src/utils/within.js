import 'jsts/dist/jsts.min.js';

/**
 * @param   { ol.geometry } geometry
 * @param   { ol.geometry } geometryToCheck
 * @returns { boolean }     whether `geometry` contains `geometryToCheck` 
 * 
 * @since 3.8.0
 */
export function within(geometry, geometryToCheck) {
  const parser = new jsts.io.OL3Parser();
  parser.inject(
      ol.geom.Point,
      ol.geom.LineString,
      ol.geom.LinearRing,
      ol.geom.Polygon,
      ol.geom.MultiPoint,
      ol.geom.MultiLineString,
      ol.geom.MultiPolygon,
  );
  return parser.read(geometryToCheck).within(parser.read(geometry))
}