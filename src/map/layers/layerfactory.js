/**
 * @file ORIGINAL SOURCE: src/app/core/layers/layerfactory.js@v3.10.2
 * @since 3.11.0
 */

import ApplicationState from 'store/application-state'

const Layer              = require('map/layers/layer');
const TableLayer         = require('map/layers/tablelayer');
const { VectorLayer }    = require('map/layers/vectorlayer');
const { VectorMapLayer } = require('map/layers/vectorlayer');
const { ImageLayer }     = require('map/layers/imagelayer');
const { WMSLayer }       = require('map/layers/imagelayer');

Object
  .entries({
    Layer,
    TableLayer,
    VectorLayer,
    VectorMapLayer,
    ImageLayer,
    WMSLayer
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

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
  [Layer.ServerTypes.OSM]: class extends ImageLayer {
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
  [Layer.ServerTypes.BING]: class extends ImageLayer {
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
  [Layer.ServerTypes.TMS]: class extends ImageLayer {
    _makeOlLayer() {
      const url        = undefined !== this.config.url ? this.config.url : null;
      const projection = url && this.getProjectionFromCrs(this.config.crs);
      if (!url) {
        return;
      }
      return new ol.layer.Tile({
        visible:    false,
        projection,
        source:     new ol.source.XYZ({
          url,
          maxZoom:     this.config.maxZoom,
          minZoom:     this.config.minZoom,
          projection,
          crossOrigin: 'anonymous',
          // tileLoadFunction:  undefined,
          /** @since 3.10.0 - Map Proxy cache_provider **/
          tileGrid:    'degrees' === projection.getUnits() ? new ol.tilegrid.TileGrid({
            // Need to remove the first resolution because in this version of ol createXYZ doesn't accept maxResolution options.
            // The extent of EPSG:4326 is not squared [-180, -90, 180, 90] as EPSG:3857 so the resolution is calculated
            // by Math.max(width(extent)/tileSize,Height(extent)/tileSize)
            // we need to calculate to Math.min instead, so we have to remove the first resolution
            resolutions: ol.tilegrid.createXYZ({ extent: projection.getExtent(), maxZoom: this.config.maxZoom }).getResolutions().slice(1),
            extent:      projection.getExtent(),
          }) : undefined,
        })
      });
    }
  },

  /**
   * ORIGINAL SOURCE: src/app/core/layers/baselayers/arcgislayer.js@3.8.6
   */
  [Layer.ServerTypes.ARCGISMAPSERVER]: class extends ImageLayer {
    _makeOlLayer() {
      return new ol.layer.Tile({
        // extent: opts.extent,
        visible: false,
        source: new ol.source.TileArcGISRest({
          url:          undefined === this.config.url ? null : this.config.url,
          projection:   this.getProjectionFromCrs(this.config.crs),
          attributions: this.config.attributions,
          // crossOrigin:  opts.crossOrigin,
        }),
      });
    }
  },

  /**
   * ORIGINAL SOURCE: src/app/core/layers/baselayers/wmtslayer.js@3.8.6
   */
  [Layer.ServerTypes.WMTS]: class extends ImageLayer {
    _makeOlLayer() {
      // use this config to get params
      const {
        url,
        layer,
        attributions,
        matrixSet,
        format = 'image/png',
        style  = 'default',
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
            format:    format || 'png',
            tileGrid:  new ol.tilegrid.WMTS({
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
   * ORIGINAL SOURCE: src/appcore/layers/baselayers/wmslayer.js@3.8.6
   */
  [Layer.ServerTypes.WMS]: class extends ImageLayer {
    _makeOlLayer() {
      return WMSLayer._makeOlLayer({
        layerObj: {
          url:          this.config.url,
          projection:   this.getProjectionFromCrs(this.config.crs),
          attributions: this.config.attributions,
          layers:       this.config.layers,
          tiled:        undefined === this.config.singleTile ? false : this.config.singleTile,
          opacity:      undefined === this.config.opacity ? 1 : this.config.opacity,
        },
    });
    }
  },

};

module.exports = {

  /**
   * @returns layer instance based on configuration
   */
  build(config = {}, options = {}) {

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
    const is_tabular = 'NoGeometry' === config.geometrytype;
    const has_geom   = config.geometrytype && WITH_GEOMETRY.includes(source.type);
    const no_geom    = !config.geometrytype && NO_GEOMETRY.includes(source.type);

    // Check Layer Type
    const is_base_layer    = config.servertype in BASE_LAYERS;
    const is_table_layer   = is_qgis && has_geom && is_tabular;
    const is_image_layer   = is_wms || is_qgis && (no_geom || (has_geom && !is_tabular) || is_pgraster);
    const is_vector_layer  = is_local || is_wfs || (is_g3w && !is_geojson);
    const is_geojson_layer = is_geojson;

    /**
     * TABLE LAYERS
     */
    if (is_table_layer)   return new TableLayer(config, options);

    /**
     * RASTER LAYERS
     */
    if (is_image_layer)   return new ImageLayer(config, options);
    if (is_base_layer)    return new BASE_LAYERS[config.servertype](config, options);

    /**
     * VECTOR LAYERS
     */
    if (is_vector_layer)  {
      return new VectorLayer(config, options);
    }

    /**
     * GEOJSON LAYER
     * 
     * ORIGINAL SOURCE: src/app/core/layers/map/geojson.js@v3.10.1
     * ORIGINAL SOURCE: src/app/core/layers/geojson.js@v3.10.1
     */
    if (is_geojson_layer) {
      const geojson = new VectorLayer(config, options);
      geojson.config.style = config.style;
      geojson.getMapLayer  = function() {
        if (!this._mapLayer) {
          this._mapLayer = new VectorMapLayer({
            url:        this.get('source').url,
            projection: this.getProjection().getCode(),
            id:         this.getId(),
            name:       this.getName(),
            style:      this.get('style'),
            provider:   this.getProvider('data')
          });
          this._mapLayer.getFeatures({
            url:           this.get('source').url,
            mapProjection: this._mapLayer.mapProjection 
          });
        }
        return this._mapLayer;
      };
      geojson.setup(config);
      return geojson;
    }

    console.warn('Uknown layer server type', config);

  }

};