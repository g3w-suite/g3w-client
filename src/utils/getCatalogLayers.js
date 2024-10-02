import ApplicationState from 'store/application';

/**
 * ORIGINAL SOURCE: src/app/core/layers/layersstoreregistry.js@v3.10.2
 */
export function getCatalogLayers(filter, options = {}) {
  return Object.values(ApplicationState.catalog).flatMap(s => s.getLayers(filter, options));
}