/**
 * @param projection
 * 
 * @returns { boolean } 
 */
export function needUseSphereMethods(projection) {
  return 'EPSG:3857' === projection.getCode() || 'degrees' === projection.getUnits();
}