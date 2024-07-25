export function getMapLayerById(layerId) {
  const { MapLayersStoresRegistry } = require('gui/map/mapservice');
  return MapLayersStoresRegistry.getLayerById(layerId);
};