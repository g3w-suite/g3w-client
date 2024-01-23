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
  const olFromJsts = new jsts.io.OL3Parser();
  return olFromJsts.read(geometry).intersects(olFromJsts.read(geometryToCheck));
}