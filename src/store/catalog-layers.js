/**
 * ORIGINAL SOURCE: src/app/core/catalog/cataloglayersstoresregistry.js@v3.4
 */

const {base, inherit} = require('core/utils/utils');
const LayersStoresRegistry = require('core/layers/layersstoresregistry');

function CatalogLayersStoresRegistry() {
  base(this);
}

inherit(CatalogLayersStoresRegistry, LayersStoresRegistry);

export default new CatalogLayersStoresRegistry();
