import MapLayersStoresRegistry from 'store/map-layers';

/**
 * @param {*} filter defaults `GEOLAYER: true`
 * @param {*} options
 * 
 * @returns mapLayer based on filtered properties of layer.
 */
export function getMapLayersByFilter(filter = {}, options = {}) {
  filter = {
    GEOLAYER: true,
    /** @TODO check if it could be used to remove the subsequent call to: `store.isQueryable()` */
    // QUERYABLE: true,
    ...filter
  };
  return MapLayersStoresRegistry
    .getLayersStores()
    .flatMap(store => store.isQueryable() ? store.getLayers(filter, options) : []);
};