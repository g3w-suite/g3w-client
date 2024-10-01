/**
 * Convert Feature to GeoJSON Format
 * 
 * @param feature
 */
export function convertFeatureToGEOJSON(feature) {
  return (new ol.format.GeoJSON()).writeFeatureObject(feature);
}