/**
 * Check if `geometryToCheck` is within `geometry`
 * 
 * @param   { ol.geometry } geometry
 * @param   { ol.geometry } geometryToCheck
 * @returns { boolean }     whether `geometryToCheck` is within `geometry`
 * 
 * @since 3.8.0
 */
export function within(geometry, geometryToCheck) {
  const olFromJsts = new jsts.io.OL3Parser();
  return olFromJsts.read(geometryToCheck).within(olFromJsts.read(geometry))
}