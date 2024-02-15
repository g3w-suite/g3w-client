import MapLayersStoresRegistry from 'store/map-layers';

export function getMapLayerById(layerId) {
  return MapLayersStoresRegistry.getLayerById(layerId);
};