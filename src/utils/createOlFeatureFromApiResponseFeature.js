import { G3W_FID } from 'app/constant';

/**
 * Convert feature from api
 * 
 * @param { Object } feature
 * @param feature.properties
 * @param feature.geometry
 * @param feature.id
 * 
 * @returns { ol.Feature }
 */
export function createOlFeatureFromApiResponseFeature(feature) {
  const properties    = undefined !== feature.properties ? feature.properties : {}
  properties[G3W_FID] = feature.id;
  const Feature       = new ol.Feature(feature.geometry && new ol.geom[feature.geometry.type](feature.geometry.coordinates));
  Feature.setProperties(properties);
  Feature.setId(feature.id);
  return Feature;
}