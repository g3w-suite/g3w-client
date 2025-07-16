import ApplicationState from 'g3w-state';

/**
 * ORIGINAL SOURCE: src/app/core/layers/layersstoreregistry.js@v3.10.2
 */
export function getCatalogLayerById(id) {
  return Object.values(ApplicationState.catalog).map(s => s.getLayerById(id)).find(l => l);
}