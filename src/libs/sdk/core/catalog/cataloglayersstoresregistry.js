const inherit = require('core/utils/utils').inherit;
const base = require('core/utils//utils').base;
const LayersStoresRegistry = require('core/layers/layersstoresregistry');

function CatalogLayersStoresRegistry() {
  base(this);
}

inherit(CatalogLayersStoresRegistry, LayersStoresRegistry);

module.exports = new CatalogLayersStoresRegistry();
