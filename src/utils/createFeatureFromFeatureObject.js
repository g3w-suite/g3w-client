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
  //extract geometry and attributes from feature Object
  const {geometry, attributes} = feature;
  //create a new ol feature
  feature = createFeatureFromGeometry({ id, geometry });
  Object
    .keys(attributes)
    .forEach(attr => feature.set(attr, attributes[attr]));
  return feature;
}