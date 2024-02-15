import { G3W_FID } from 'app/constant';

/**
 * @param { Array } features 
 * 
 * @returns { Array<{ geometry, attributes, id }> }
 */
export function convertVectorFeaturesToResultFeatures(features = []) {
  return features.map(feature => {
    feature.properties[G3W_FID] = feature.id;
    return {
      geometry:   feature.geometry,
      attributes: feature.properties,
      id:         feature.id,
    };
  });
}