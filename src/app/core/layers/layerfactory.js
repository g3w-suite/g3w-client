const Layer        = require('core/layers/layer');
const TableLayer   = require('core/layers/tablelayer');
const VectorLayer  = require('core/layers/vectorlayer');
const ImageLayer   = require('core/layers/imagelayer');
const BaseLayers   = require('core/layers/baselayers/baselayers');
const GeojsonLayer = require('core/layers/geojson');

const TABLE_LAYERS = [
  Layer.SourceTypes.VIRTUAL,
  Layer.SourceTypes.POSTGIS,
  Layer.SourceTypes.MSSQL,
  Layer.SourceTypes.SPATIALITE,
  Layer.SourceTypes.WFS,
  Layer.SourceTypes.CSV,
  Layer.SourceTypes.ORACLE,
  Layer.SourceTypes.OGR,
  Layer.SourceTypes.MDAL,
];

const IMAGE_LAYERS = [
  Layer.SourceTypes.WMST,
  Layer.SourceTypes.WCS,
  Layer.SourceTypes.WMS,
  Layer.SourceTypes.GDAL,
  Layer.SourceTypes.VECTORTILE,
  Layer.SourceTypes["VECTOR-TILE"],
  Layer.SourceTypes.MDAL,
];

const BASE_LAYERS = [
  Layer.ServerTypes.OSM,
  Layer.ServerTypes.BING,
  Layer.ServerTypes.TMS,
  Layer.ServerTypes.WMS,
  Layer.ServerTypes.WMTS,
  Layer.ServerTypes.ARCGISMAPSERVER,
];

// Class to build layer based on configuration
class LayerFactory {

  /**
   * @returns layer instance
   */
  build(config, options) {
    const layerClass = this.get(config);
    return layerClass ? new layerClass(config, options) : null
  }

  /**
   * @returns layer class
   */
  get(config = {}) {

    if (!config.servertype) {
      console.warn('Undefined layer server type');
      return;
    }

    const is_qgis    = Layer.ServerTypes.QGIS     === config.servertype;
    const is_ogc     = Layer.ServerTypes.OGC      === config.servertype; 
    const is_g3w     = Layer.ServerTypes.G3WSUITE === config.servertype
    const is_local   = Layer.ServerTypes.LOCAL    === config.servertype;

    const has_type   = config.source && config.geometrytype;
    const is_table   = is_qgis       && has_type             && TABLE_LAYERS.includes(config.source.type);
    const is_image   = is_qgis       && !has_type            && IMAGE_LAYERS.includes(config.source.type);
    const is_wms     = is_ogc        && config.source        && Layer.SourceTypes.WMS     === config.source.type;
    const is_wfs     = is_ogc        && config.source        && Layer.SourceTypes.WFS     === config.source.type;
    const is_geojson = is_g3w        && config.source        && Layer.SourceTypes.GEOJSON === config.source.type;

    const no_geom    = config.geometrytype === 'NoGeometry';

    const is_table_layer   = is_table && no_geom;
    const is_image_layer   = (is_table && !no_geom) || is_image || is_wms
    const is_vector_layer  = is_local || is_wfs || (is_g3w && !is_geojson);
    const is_base_layer    = BASE_LAYERS.includes(config.servertype);
    const is_geojson_layer = is_geojson;

    if (is_table_layer)   return TableLayer;
    if (is_image_layer)   return ImageLayer;
    if (is_vector_layer)  return VectorLayer;
    if (is_base_layer)    return BaseLayers[config.servertype];
    if (is_geojson_layer) return GeojsonLayer;

    console.warn('Uknown layer server type', config);

    // return BaseLayers[config.source.type.toUpperCase()];
    // return ImageLayer;

  }

}

module.exports = new LayerFactory();