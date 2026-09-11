import ApplicationState from 'g3w-state';

/**
 * ORIGINAL SOURCE: src/app/core/layers/layersstoreregistry.js@v3.10.2
 */
export function getCatalogLayerById(id) {
  return ApplicationState.project.getLayerById(id) || null;
}