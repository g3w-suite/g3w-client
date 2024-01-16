import MapLayersStoresRegistry from 'store/map-layers';

/**
 * @param filter default is: `GEOLAYER: true`
 * @param options
 * 
 * @returns { Array } map layers based on filter (properties of layer. Es GEOLAYER etc..)
 */
export function getMapLayersByFilter(filter = {}, options = {}) {
  return MapLayersStoresRegistry
    .getQuerableLayersStores()
    .flatMap(store => store.getLayers({ GEOLAYER: true, ...filter }, options));
}