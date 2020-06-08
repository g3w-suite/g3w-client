const inherit = require('core/utils/utils').inherit;
const base = require('core/utils//utils').base;
const LayersStoresRegistry = require('core/layers/layersstoresregistry');

function MapLayersStoresRegistry() {
  base(this);
}

inherit(MapLayersStoresRegistry, LayersStoresRegistry);

module.exports = new MapLayersStoresRegistry();
