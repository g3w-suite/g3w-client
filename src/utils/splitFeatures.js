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
    .reduce((a, f) => {
      const geometries = splitFeature({ splitfeature, feature: f });
      if (geometries.length > 1) {
        a.push({ uid: f.getUid(), geometries });
      }
      return a;
    }, []);
}