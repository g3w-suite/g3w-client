/**
 * @file Store Open Layers levels (raster images, vector shapes, markers, ...)
 * @since v3.6
 */

const { inherit, base } = require('utils');
const LayersStoresRegistry = require('core/layers/layersstoresregistry');

function MapLayersStoresRegistry() {
  base(this);
}

inherit(MapLayersStoresRegistry, LayersStoresRegistry);

export default new MapLayersStoresRegistry();
