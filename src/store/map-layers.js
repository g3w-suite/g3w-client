/**
 * @file Store Open Layers levels (raster images, vector shapes, markers, ...)
 * @since v3.6
 */
const LayersStoresRegistry = require('core/layers/layersstoresregistry');

export default new (class CatalogLayersStoresRegistry extends LayersStoresRegistry  {
  constructor() {
    super()
  }

  getLayers(filter) {
    return Object.values(this.stores).flatMap(s => s.getLayers(filter, { TOC: true }));
  }

});