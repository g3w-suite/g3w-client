/**
 * @file State of legend items in Table of Contents (TOC) [aka. catalog layers]
 * @since v3.6
 */

const LayersStoresRegistry = require('core/layers/layersstoresregistry');

export default new (class CatalogLayersStoresRegistry extends LayersStoresRegistry  {
  constructor() {
    super()
  }

  getLayers(filter) {
    return Object.values(this.stores).flatMap(s => s.getLayers(filter, { TOC_ORDER: true }));
  }

});