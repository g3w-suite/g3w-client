import MapLayersStoresRegistry from 'store/map-layers';

/**
 * @param filter defaults `GEOLAYER: true`
 * @param options
 * 
 * @returns { Array } map layers based on filtered properties of layer (eg. `GEOLAYER : true`)
 */
export function getMapLayersByFilter(filter = {}, options = {}) {
  filter = {
    GEOLAYER: true,
    /** @TODO check if it could be used to remove the subsequent call to: `store.isQueryable()` */
    // QUERYABLE: true,
    ...filter
  };
  return MapLayersStoresRegistry
    .getQuerableLayersStores()
    .flatMap(store => store.isQueryable() ? store.getLayers(filter, options) : []);
}