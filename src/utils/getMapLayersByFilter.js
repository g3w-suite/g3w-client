import MapLayersStoresRegistry from 'store/map-layers';

/**
 * @param {*} filter defaults `GEOLAYER: true`
 * @param {*} options
 * 
 * @returns mapLayer based on filtered properties of layer.
 */
export function getMapLayersByFilter(filter = {}, options = {}) {
  filter = { GEOLAYER: true, ...filter };
  return MapLayersStoresRegistry.getQuerableLayersStores().flatMap(store => store.getLayers(filter, options));
};