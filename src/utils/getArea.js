/**
 * Return area from geome
 * @since 4.0.0
 * @param {*} geom 
 * @param {*} epsg 
 * @param {*} units 
 * @returns Number
 */
export function getArea(geom, epsg, units) {
  const is_sphere  = 'EPSG:3857' === epsg || 'degrees' === units;
  const area       = Math.round(is_sphere ? ol.sphere.getArea(geom, { projection: epsg }): geom.getArea());
  return area > 10000 ? (Math.round((area / 1000000) * 100) / 100) +  ' km²' : (Math.round(area * 100) / 100) + ' m²';
}