/**
 * @param { number[] } coordinates 
 * @returns { ol.Feature | undefined } feature 
 */
export function createFeatureFromCoordinates(coordinates) {
  if (Array.isArray(coordinates) && 2 === coordinates.length) {
    return new ol.Feature(new ol.geom.Point(coordinates));
  }
}