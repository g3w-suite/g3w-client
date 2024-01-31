import { createVectorLayerFromFeatures } from 'utils/createVectorLayerFromFeatures';

export function createVectorLayerFromGeometry(geometry) {
  return createVectorLayerFromFeatures(new ol.Feature(geometry));
}