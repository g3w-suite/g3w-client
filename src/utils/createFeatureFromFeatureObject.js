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
  const { attributes } = feature;
  //create a new ol feature
  if (feature.geometry) {
    feature = new ol.Feature(feature.geometry);
    feature.setId(id);
  }
  Object.keys(attributes).forEach(attr => feature.set(attr, attributes[attr]));
  return feature;
}