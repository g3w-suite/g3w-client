import ApplicationState from 'g3w-state';

/**
 * ORIGINAL SOURCE: src/app/core/layers/layersstoreregistry.js@v3.10.2
 */
export function getCatalogLayers(filter, options = {}) {
  return Object.values(ApplicationState.layers).filter(s => s.showOnCatalog()).flatMap(s => s.getLayers(filter, options));
}