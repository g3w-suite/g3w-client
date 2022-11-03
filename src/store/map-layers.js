/**
 * ORIGINAL SOURCE: src/app/core/map/maplayersstoresregistry.js@v3.4
 */

const { inherit, base } = require('core/utils/utils');
const LayersStoresRegistry = require('core/layers/layersstoresregistry');

function MapLayersStoresRegistry() {
  base(this);
}

inherit(MapLayersStoresRegistry, LayersStoresRegistry);

export default new MapLayersStoresRegistry();
