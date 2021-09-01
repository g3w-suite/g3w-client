const {inherit, base} = require('core/utils/utils');
const LayersStoresRegistry = require('core/layers/layersstoresregistry');

function MapLayersStoresRegistry() {
  base(this);
}

inherit(MapLayersStoresRegistry, LayersStoresRegistry);

module.exports = new MapLayersStoresRegistry();
