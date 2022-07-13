const { base, inherit } = require('core/utils/utils');
const LayersStoresRegistry = require('core/layers/layersstoresregistry');

function CatalogLayersStoresRegistry() {
  base(this);
}

inherit(CatalogLayersStoresRegistry, LayersStoresRegistry);

module.exports = new CatalogLayersStoresRegistry();
