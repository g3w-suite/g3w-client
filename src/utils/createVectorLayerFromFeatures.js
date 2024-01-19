/**
 * @param feature 
 * 
 * @returns { ol.layer.Vector } 
 */
export function createVectorLayerFromFeatures(feature) {
  return new ol.layer.Vector({
    source: new ol.source.Vector({
      features: Array.isArray(feature) ? feature : [feature],
    }),
  });
}