/**
 * @param { number } degrees
 * @returns { number }
 */
export function getMetersFromDegrees(degrees) {
  return degrees * ol.proj.Units.METERS_PER_UNIT.degrees;
}