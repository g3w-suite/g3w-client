import { createFeatureFromGeometry } from 'utils/createFeatureFromGeometry';

/**
  * @param { Object } opts
  * @param opts.id
  * @param opts.feature
  * 
  * @returns { ol.Feature | undefined }
  * 
  * @example in case of feature object
  * ```
  * {
  *   id: X,
  *   attributes: {key:value}
  *   geometry: geometry
  * }
  * ```
  */
export function createFeatureFromFeatureObject({ id, feature = {} }) {
  feature = createFeatureFromGeometry({ id, geometry: feature.geometry });
  Object
    .keys(feature.attributes)
    .forEach(attr => feature.set(attr, feature.attributes[attr]));
  return feature;
};