import jsts from 'jsts/dist/jsts.min.js';

/**
 * Check if `geometryCheck` intersects with `geometry`
 * 
 * @param   {ol.geometry} geometry
 * @param   {ol.geometry} geometryToCheck
 * 
 * @returns {boolean}     whether `geometryToCheck` interesects `geometry`
 * 
 * @since 3.8.0
 */
export function intersects(geometry, geometryToCheck) {
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
  return parser.read(geometry).intersects(parser.read(geometryToCheck));
}