import ApplicationState from 'store/application';
/**
 * @param filter defaults `GEOLAYER: true`
 * @param options
 * 
 * @returns { Array } map layers based on filtered properties of layer (eg. `GEOLAYER : true`)
 */
export function getMapLayersByFilter(filter = {}, options = {}) {
  return Object.values(ApplicationState.layers)
    .filter(s => s.isQueryable())
    .flatMap(s => s.getLayers({
      GEOLAYER: true,
      /** @TODO check if it could be used to remove the subsequent call to: `store.isQueryable()` */
      // QUERYABLE: true,
      ...(filter || {})
    }, options));
}