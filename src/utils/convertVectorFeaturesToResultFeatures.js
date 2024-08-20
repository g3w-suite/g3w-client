import { G3W_FID } from 'app/constant';

/**
 * @param { Array } features 
 * 
 * @returns { Array<{ geometry, attributes, id }> }
 */
export function convertVectorFeaturesToResultFeatures(features = []) {
  return features.map(f => {
    f.properties[G3W_FID] = f.id;
    return {
      geometry:   f.geometry,
      attributes: f.properties,
      id:         f.id,
    };
  });
}