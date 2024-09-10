export function getMapLayerById(layerId) {
  const { MapLayersStoresRegistry } = require('services/map').default;
  return MapLayersStoresRegistry.getLayerById(layerId);
}