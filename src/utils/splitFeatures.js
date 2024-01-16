import { splitFeature } from 'utils/splitFeature';

/**
 * @param { Object } opts
 * @param { Array } opts.features
 * @param opts.splitfeature
 * 
 * @returns { Array } splittered geometries
 */
export function splitFeatures({
  features = [],
  splitfeature,
} = {}) {
  return features
    .map(f => {
      const geometries = splitFeature({ splitfeature, feature: f });
      return geometries.length > 1 ? { uid: f.getUid(), geometries } : null;
    })
    .filter(Boolean);
};