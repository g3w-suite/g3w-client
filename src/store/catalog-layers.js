/**
 * @file State of legend items in Table of Contents (TOC) [aka. catalog layers]
 * @since v3.6
 */

const { base, inherit } = require('utils');
const LayersStoresRegistry = require('core/layers/layersstoresregistry');

function CatalogLayersStoresRegistry() {
  base(this);
}

inherit(CatalogLayersStoresRegistry, LayersStoresRegistry);

export default new CatalogLayersStoresRegistry();
