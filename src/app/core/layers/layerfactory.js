import ApplicationState from 'store/application-state'

const Layer        = require('core/layers/layer');
const TableLayer   = require('core/layers/tablelayer');
const VectorLayer  = require('core/layers/vectorlayer');
const ImageLayer   = require('core/layers/imagelayer');
const BaseLayer    = require('core/layers/baselayer');
const BASE         = require('g3w-ol/layers/bases');
const GeojsonLayer = require('core/layers/geojson');

const WITH_GEOMETRY = [
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

const NO_GEOMETRY = [
  Layer.SourceTypes.WMST,
  Layer.SourceTypes.WCS,
  Layer.SourceTypes.WMS,
  Layer.SourceTypes.GDAL,
  Layer.SourceTypes.VECTORTILE,
  Layer.SourceTypes["VECTOR-TILE"],
  Layer.SourceTypes.MDAL,
  /** @since 3.8.7 */
  Layer.SourceTypes.ARCGISMAPSERVER,
  /** @since 3.9.0 */
  Layer.SourceTypes.POSTGRESRASTER,
];

const BASE_LAYERS   = {

  /**
   * ORIGINAL SOURCE: src/core/layers/baselayers/osmlayer.js@3.8.6
   */
  [Layer.ServerTypes.OSM]: class OSMLayer extends BaseLayer {
    _makeOlLayer() {
      return BASE.OSM.get({
        id:    this.config.name,
        title: this.config.title,
        url:   this.config.url,
      });
    }
  },

  /**
   * ORIGINAL SOURCE: core/layers/baselayers/binglayer.js@3.8.6
   */
  [Layer.ServerTypes.BING]: class BingLayer extends BaseLayer {
    _makeOlLayer() {
      const key = ApplicationState.keys.vendorkeys.bing;
      switch(this.config.source ? this.config.source.subtype : null) {
        case 'streets':          return BASE.BING.get({ key, imagerySet: 'Road' });
        case 'aerial':           return BASE.BING.get({ key, imagerySet: 'Aerial' });
        case 'aerialwithlabels': return BASE.BING.get({ key, imagerySet: 'AerialWithLabels' });
        default:                 return BASE.BING.get({ key, imagerySet: 'Aerial' });
      }
    }
  },

  /**
   * ORIGINAL SOURCE: src/core/layers/baselayers/tmslayer.js@3.8.6
   */
  [Layer.ServerTypes.TMS]: class TMSLayer extends BaseLayer {
    _makeOlLayer() {
      // configuration to create TMS
      const { url, attributions, minZoom, maxZoom, crs } = this.config;
      return BASE.TMS.get({
        url,
        minZoom,
        maxZoom,
        attributions,
        projection: this.getProjectionFromCrs(crs),
      });
    }
  },

  /**
   * ORIGINAL SOURCE: src/require('core/layers/baselayers/arcgislayer.js@3.8.6
   */
  [Layer.ServerTypes.ARCGISMAPSERVER]: class ARCGISMAPSERVERLayer extends BaseLayer {
    _makeOlLayer() {
      // configuration to create TMS
      const { url, attributions, crs } = this.config;
      return BASE.TMS.get({
        url,
        source_type: 'arcgismapserver',
        projection: this.getProjectionFromCrs(crs),
        attributions,
      });
    }
  },

  /**
   * ORIGINAL SOURCE: src/require('core/layers/baselayers/wmtslayer.js@3.8.6
   */
  [Layer.ServerTypes.WMTS]: class WMTSLayer extends BaseLayer {
    _makeOlLayer() {
      // use this config to get params
      const {
        url,
        layer,
        attributions,
        matrixSet,
        format,
        style,
        requestEncoding,
        crs,
        grid, /** @since 3.10.0*/
        grid_extent, /** @since 3.10.0 */
        extent, /** @since 3.10.0 */
        projection, /** @since 3.10.0 */
      } = this.config;
      return BASE.WMTS.get({
        url,
        layer,
        attributions,
        format,
        projection: projection || this.getProjectionFromCrs(crs),
        requestEncoding,
        matrixSet,
        style,
        grid,
        grid_extent,
        extent,
      });
    }
  },

  /**
   * ORIGINAL SOURCE: src/require('core/layers/baselayers/wmslayer.js@3.8.6
   */
  [Layer.ServerTypes.WMS]: class WMSLayer extends BaseLayer {
    _makeOlLayer() {
      // use this config to get params
      const { url, layers, singleTile, attributions, crs, opacity } = this.config;
      return BASE.WMS.get({
        url,
        layers,
        singleTile,
        attributions,
        projection: this.getProjectionFromCrs(crs),
        opacity,
      });
    }
  },

};

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

    // Get Source
    const source = config.source || {};

    // Check Server Type
    const is_qgis     = Layer.ServerTypes.QGIS                       === config.servertype;
    const is_ogc      = Layer.ServerTypes.OGC                        === config.servertype;
    const is_g3w      = Layer.ServerTypes.G3WSUITE                   === config.servertype
    const is_local    = Layer.ServerTypes.LOCAL                      === config.servertype;

    const is_wms      = is_ogc  && Layer.SourceTypes.WMS             === source.type;
    const is_wfs      = is_ogc  && Layer.SourceTypes.WFS             === source.type;
    const is_geojson  = is_g3w  && Layer.SourceTypes.GEOJSON         === source.type;
    const is_pgraster = is_qgis && Layer.SourceTypes.POSTGRESRASTER  === source.type;

    // Check Geometry Type
    const is_tabular = config.geometrytype === 'NoGeometry';
    const has_geom   = config.geometrytype && WITH_GEOMETRY.includes(source.type);
    const no_geom    = !config.geometrytype && NO_GEOMETRY.includes(source.type);

    // Check Layer Type
    const is_base_layer    = config.servertype in BASE_LAYERS;
    const is_table_layer   = is_qgis && has_geom && is_tabular;
    const is_image_layer   = is_wms || is_qgis && (no_geom || (has_geom && !is_tabular) || is_pgraster);
    const is_vector_layer  = is_local || is_wfs || (is_g3w && !is_geojson);
    const is_geojson_layer = is_geojson;

    // Return Layer Class
    if (is_table_layer)   return TableLayer;
    if (is_image_layer)   return ImageLayer;
    if (is_vector_layer)  return VectorLayer;
    if (is_base_layer)    return BASE_LAYERS[config.servertype];
    if (is_geojson_layer) return GeojsonLayer;

    console.warn('Uknown layer server type', config);

    // return BaseLayers[config.source.type.toUpperCase()];
    // return ImageLayer;

  }

}

module.exports = new LayerFactory();