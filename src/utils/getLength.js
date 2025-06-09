/**
 * Return Length from geometry
 * @since 4.0.0
 * @param {*} geom 
 * @param {*} epsg 
 * @param {*} units
 * @return Number 
 * 
 */
export function getLength(geom, epsg, units) {
  const is_sphere  = 'EPSG:3857' === epsg || 'degrees' === units;
  const len        = is_sphere ? ol.sphere.getLength(geom, { projection: epsg }) : geom.getLength();
  return len > 100 ? (Math.round((len / 1000) * 100) / 100) +  ' km' : (Math.round(len * 100) / 100) + ' m';
}