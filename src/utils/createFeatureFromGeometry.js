/**
 * @param { Object } opts
 * @param opts.id
 * @param opts.geometry
 * 
 * @returns { ol.Feature | undefined } feature 
 */
export function createFeatureFromGeometry({ id, geometry } = {}) {
  if (geometry) {
    const feature = new ol.Feature(geometry);
    feature.setId(id);
    return feature;
  }
}