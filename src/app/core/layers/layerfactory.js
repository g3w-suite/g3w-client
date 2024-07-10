import ApplicationState from 'store/application-state'

const Layer        = require('core/layers/layer');
const TableLayer   = require('core/layers/tablelayer');
const VectorLayer  = require('core/layers/vectorlayer');
const ImageLayer   = require('core/layers/imagelayer');
const BaseLayer    = require('core/layers/baselayer');
const RasterLayers = require('g3w-ol/layers/rasters');
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
      return new ol.layer.Tile({
        source:  new ol.source.OSM({ url: this.config.url }),
        id:      this.config.name  || 'osm',
        title:   this.config.title || 'OSM',
        basemap: true
      });
    }
  },

  /**
   * ORIGINAL SOURCE: core/layers/baselayers/binglayer.js@3.8.6
   */
  [Layer.ServerTypes.BING]: class BingLayer extends BaseLayer {
    _makeOlLayer() {
      const name = ({
        streets:          'Road',
        aerial:           'Aerial',
        aerialwithlabels: 'AerialWithLabels'
      })[this.config.source && this.config.source.subtype] || 'Aerial';
      return new ol.layer.Tile({
        name,
        visible: false,
        preload: Infinity,
        source: new ol.source.BingMaps({ imagerySet: name, key: ApplicationState.keys.vendorkeys.bing }),
        basemap: true,
      });
    }
  },

  /**
   * ORIGINAL SOURCE: src/core/layers/baselayers/tmslayer.js@3.8.6
   */
  [Layer.ServerTypes.TMS]: class TMSLayer extends BaseLayer {
    _makeOlLayer() {
      return RasterLayers.XYZLayer({
        visible:      false,
        url:          undefined !== this.config.url ? this.config.url : null,
        minZoom:      this.config.minZoom,
        maxZoom:      this.config.maxZoom,
        attributions: this.config.attributions,
        projection:   this.getProjectionFromCrs(this.config.crs),
        crossOrigin: 'anonymous',
      });
    }
  },

  /**
   * ORIGINAL SOURCE: src/require('core/layers/baselayers/arcgislayer.js@3.8.6
   */
  [Layer.ServerTypes.ARCGISMAPSERVER]: class ARCGISMAPSERVERLayer extends BaseLayer {
    _makeOlLayer() {
      return new ol.layer.Tile({
        // extent: opts.extent,
        visible: false,
        source: new ol.source.TileArcGISRest({
          url:          undefined !== this.config.url ? this.config.url : null,
          projection:   this.getProjectionFromCrs(this.config.crs),
          attributions: this.config.attributions,
          // crossOrigin:  opts.crossOrigin,
        }),
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
        format='image/png',
        style='default',
        requestEncoding,
        grid, /** @since 3.10.0*/
        grid_extent, /** @since 3.10.0 */
      } = this.config;

      /** @since 3.10.0 */
      let projection = this.config.projection || this.getProjectionFromCrs(this.config.crs);

      if (matrixSet) {
        const size = ol.extent.getWidth(projection.getExtent()) / 256;
        return new ol.layer.Tile({
          opacity: .7,
          source: new ol.source.WMTS({
            url,
            projection,
            layer,
            matrixSet,
            requestEncoding,
            format,
            attributions,
            tileGrid: new ol.tilegrid.WMTS({
              origin:      ol.extent.getTopLeft(projection.getExtent()),
              resolutions: Array.from({ length: 14 }, (_, z) => size / Math.pow(2, z)),
              matrixIds:   Array.from({ length: 14 }, (_, z) => z),
            }),
            style
          })
        });
      }

      /** @since 3.10.0 WMTS based on mapproxy*/
      if (grid && grid_extent) {
        const resolutions = ol.tilegrid.createXYZ({ extent: grid_extent }).getResolutions();
        return new ol.layer.Tile({
          source: new ol.source.WMTS({
            url,
            layer,
            projection,
            matrixSet: grid,
            format: format || 'png',
            tileGrid: new ol.tilegrid.WMTS({
              origin: ol.extent.getTopLeft(grid_extent),
              resolutions,
              matrixIds: resolutions.map((_, z) => z),
            }),
            style,
            transparent: false,
          })
        });
      }

    }
  },

  /**
   * ORIGINAL SOURCE: src/require('core/layers/baselayers/wmslayer.js@3.8.6
   */
  [Layer.ServerTypes.WMS]: class WMSLayer extends BaseLayer {
    _makeOlLayer() {
      return RasterLayers.WMSLayer({
        layerObj: {
          url:          this.config.url,
          projection:   this.getProjectionFromCrs(this.config.crs),
          attributions: this.config.attributions,
          layers:       this.config.layers,
          tiled:        undefined !== this.config.singleTile ? this.config.singleTile : false,
          opacity:      undefined !== this.config.opacity ? this.config.opacity : 1,
        },
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