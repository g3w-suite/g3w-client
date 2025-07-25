/**
 * @file
 * 
 * ORIGINAL SOURCE: src/map/layers/layer.js@v4.0.0
 * ORIGINAL SOURCE: src/map/layers/imagelayer.js@v4.0.0
 * ORIGINAL SOURCE: src/map/layers/vectorlayer.js@v4.0.0
 * ORIGINAL SOURCE: src/map/layers/tablelayer.js@v4.0.0
 * ORIGINAL SOURCE: src/utils/parsers/index.js@v4.0.0
 * 
 * @since 4.1.0
 */

import {
  GEOMETRY_FIELDS,
  SELECTION,
  DOTS_PER_INCH,
  QUERY_POINT_TOLERANCE,
  TIMEOUT,
  G3W_FID,
}                                 from 'g3w-constants';
import G3WObject                  from 'g3w-object';
import { gettext as _ }           from 'g3w-i18n';
import ApplicationState           from 'g3w-state';
import DataRouterService          from 'services/data';
import GUI                        from 'services/gui';

import Table                      from 'components/Table.vue';

import { saveBlob }               from 'utils/saveBlob';
import { XHR }                    from 'utils/XHR';
import { prompt }                 from 'utils/prompt';
import { get_legend_params }      from 'utils/get_legend_params';
import { getCatalogLayerById }    from 'utils/getCatalogLayerById';
import { getScaleFromResolution } from 'utils/getScaleFromResolution';
import { isPointGeometryType }    from 'utils/isPointGeometryType';
import { isLineGeometryType }     from 'utils/isLineGeometryType';
import { isPolygonGeometryType }  from 'utils/isPolygonGeometryType';
import { cloneDeep }              from 'utils/cloneDeep';
import { groupBy }                from 'utils/groupBy';
import { is3DGeometry }           from 'utils/is3DGeometry';
import { removeZValue }           from 'utils/removeZValue';
import { sanitizeFidFeature }     from 'utils/sanitizeFidFeature'
import { reverseGeometry }        from 'utils/reverseGeometry';

const NUMERIC_FIELD = 'GIS3W_ESCAPE_NUMERIC_FIELD_';

const DOWNLOAD_FORMATS = {
  download:        { format: 'shapefile', url: 'shp' },
  download_gpkg:   { format: 'gpkg',      url: 'gpkg' },
  download_gpx:    { format: 'gpx',       url: 'gpx' },
  download_csv:    { format: 'csv',       url: 'csv' },
  download_xls:    { format: 'xls',       url: 'xls' },
  download_raster: { format: 'geotiff',   url: 'geotiff' },
  download_pdf:    { format: 'pdf',       url: 'pdf' },
};

/**
 * Stringify a query URL param (eg. `&WIDTH=700`)
 * 
 * @param name
 * @param value
 * 
 * @returns { string | null } a string if value is set or null
 */
function __(name, value) {
  return [null, undefined].includes(value) ? value : `${name}${value}`;
}

// BACKCOMP v3.x
function createProvider(name, layer) {
  const provider = new Providers[name];
  return Object.assign(provider, {
    _name:       name,
    _layer:      layer,
    getLayer:    () => provider._layer,
    setLayer:    l  => provider._layer = l,
    getFeatures: provider.getFeatures || (() => console.log('overwriteby single provider')),
    query:       provider.query       || (() => console.log('overwriteby single provider')),
    getName:     () => provider._name,
  });
}

/**
 * ORIGINAL SOURCE: src/app/core/layers/providersfactory.js@v3.10.2
 * ORIGINAL SOURCE: src/app/core/layers/providers/geojsonprovider.js@3.8.6
 * ORIGINAL SOURCE: src/app/core/layers/providers/qgisprovider.js@3.8.6
 * ORIGINAL SOURCE: src/app/core/layers/providers/wmsprovider.js@3.8.6
 * ORIGINAL SOURCE: src/app/core/layers/providers/wmsprovider.js@3.8.6
 */
const Providers = {

  geojson: class {

    async query() {
      return [];
    }

    async getFeatures(opts = {}) {
      return (new ol.format.GeoJSON()).readFeatures(
        opts.data || (await XHR.get({ url: opts.url || this._layer.get('source').url })).results, {
        featureProjection: opts.mapProjection,
        dataProjection:    opts.projection || 'EPSG:4326',
      })
    }

  },

  qgis: class {

    /**
     * Query by filter
     * 
     * @param { boolean } opts.raw           whether to get raw response
     * @param { number }  opts.feature_count maximum feature for request
     * @param { string }  opts.queryUrl      url for request data
     * @param { Array }   opts.layers        Array or request layers
     * @param opts.I                         wms request parameter 
     * @param opts.J                         wms request parameter 
     */
    async query(opts = {}) {
      this._projections      = this._projections || { map: null, layer: null };
     
      const is_table = 'table' === this._layer.getType();

      // in case not alphanumeric layer set projection
      if (!is_table) {
        this._projections.map = ApplicationState.project.getProjection() || this._projections.layer;
      }

      const layers = opts.layers ? opts.layers.map(l => l.getWMSLayerName()).join(',') : this._layer.getWMSLayerName();

      // skip when ..
      if (!opts.filter) {
        return Promise.reject();
      }

      let filter = [].concat(opts.filter)
        // BACKCOMP v3.x
        .map(f => ({
          type:  f._type || f.type,
          value: (f._filter || f.value)
        }));

      // check if geometry filter. If not i have to remove projection layer
      if ('geometry' !== filter[0].type) {
        this._projections.layer = null;
      }

      filter = filter.filter(f => f.value);

      const response = await XHR.get({
        url: opts.queryUrl || this._layer.getUrl('query'),
        params: {
          SERVICE:       'WMS',
          VERSION:       '1.3.0',
          REQUEST:       'GetFeatureInfo',
          filtertoken:   ApplicationState.tokens.filtertoken,
          LAYERS:        layers,
          QUERY_LAYERS:  layers,
          INFO_FORMAT:   this._layer.getInfoFormat() || 'application/vnd.ogc.gml',
          FEATURE_COUNT: opts.feature_count || 10,
          CRS:           (is_table ? ApplicationState.map.epsg : this._projections.map.getCode()),
          I:             opts.I,
          J:             opts.J,
          FILTER:        filter.length ? filter.map(f => f.value).join(';') : undefined,
          WITH_GEOMETRY: !is_table,
        },
      });

      const _layers = undefined === opts.layers ? [this._layer] : opts.layers;

      return opts.raw ? response : Layer._parse(_layers[0].getInfoFormat(), {
        response,
        projections: this._projections,
        layers:      _layers,
        wms:         true,
      });

    }

    /**
     * get layer config
     */
    getConfig() {
      return XHR.get({ url: this._layer.getUrl('config') });
    }

    /**
     * Load editing features (Read / Write)
     */
    async getFeatures(options = {}, params = {}) {
      // filter null values
      Object
        .entries(params)
        .forEach(([key, value]) => {
          if ([null, undefined].includes(value)) {
            delete params[key];
          }
      });

      // editing mode
      if (options.editing) {
        return await GUI.getPlugin('editing').fetchVectorData(this._layer, options, params);
      }

      // read mode
      const response = await XHR.post({
        url:         this._layer.getUrl('data'),
        data:        JSON.stringify(params),
        contentType: 'application/json',
      });

      return {
        data: response.vector.data,
        count: response.vector.count
      };

    }

  },

  wms: class {

    query(opts = {}) {
      const {
        layers        = [this._layer],
        size          = [101, 101],
        coordinates   = [],
        resolution,
      } = opts;

      // get extent for view size
      const dx   = resolution * size[0] / 2;
      const dy   = resolution * size[1] / 2;
      const bbox = [coordinates[0] - dx, coordinates[1] - dy, coordinates[0] + dx, coordinates[1] + dy];

      const projection = ApplicationState.project.getProjection() || this._layer.getProjection();
      const tolerance  = opts.query_point_tolerance ?? QUERY_POINT_TOLERANCE;

      const url    = layers[0].getQueryUrl();
      const method = layers[0].getOwsMethod();
      const proxy  = layers[0].useProxy();
      const source = (url || '').split('SOURCE');

      // base request
      const params = {
        SERVICE:              'WMS',
        VERSION:              '1.3.0',
        REQUEST:              'GetFeatureInfo',
        CRS:                  projection.getCode(),
        LAYERS:               (layers || [this._layer.getWMSInfoLayerName()]).map(l => l.getWMSInfoLayerName()).join(','),
        QUERY_LAYERS:         (layers || [this._layer.getWMSInfoLayerName()]).map(l => l.getWMSInfoLayerName()).join(','),
        filtertoken:          ApplicationState.tokens.filtertoken,
        INFO_FORMAT:          this._layer.getInfoFormat() || 'application/vnd.ogc.gml',
        FEATURE_COUNT:        opts.feature_count ?? 10,
        WITH_GEOMETRY:        true,
        DPI:                  DOTS_PER_INCH,
        FILTER_GEOM:          'map' === tolerance.unit ? (new ol.format.WKT()).writeGeometry(ol.geom.Polygon.fromCircle(new ol.geom.Circle(coordinates, tolerance.value))) : undefined,
        FI_POINT_TOLERANCE:   'map' === tolerance.unit ? undefined : tolerance.value,
        FI_LINE_TOLERANCE:    'map' === tolerance.unit ? undefined : tolerance.value,
        FI_POLYGON_TOLERANCE: 'map' === tolerance.unit ? undefined : tolerance.value,
        G3W_TOLERANCE:        'map' === tolerance.unit ? undefined : tolerance.value * resolution,
        I:                    'map' === tolerance.unit ? undefined : Math.floor((coordinates[0] - bbox[0]) / resolution), // x
        J:                    'map' === tolerance.unit ? undefined : Math.floor((bbox[3] - coordinates[1]) / resolution), // y
        WIDTH:                size[0],
        HEIGHT:               size[1],
        STYLES:               (layers || []).map(l => l.getStyle()).join(','),
        BBOX:                 ('ne' === projection.getAxisOrientation().substr(0, 2) ? [bbox[1], bbox[0], bbox[3], bbox[2]] : bbox).join(','),
        // HOTFIX for GetFeatureInfo requests and feature layer categories that are not visible (unchecked) at QGIS project setting
        LEGEND_ON:            layers.flatMap(l => get_legend_params(l).LEGEND_ON).filter(Boolean).join(';')  || undefined,
        LEGEND_OFF:           layers.flatMap(l => get_legend_params(l).LEGEND_OFF).filter(Boolean).join(';') || undefined,
        SOURCE:               (!proxy && 'GET' === method && source.length > 1) ? source[1] : undefined,
      };

      let timer;

      // promise with timeout
      return Promise.race([
        new Promise(res => { timer = setTimeout(() => { res({
          data:  (layers || []).map(layer => ({ layer, rawdata: 'timeout' })),
          query: { coordinates, resolution },
        }); }, TIMEOUT) }),
        (async () => {
          try {
            let response;

            if (proxy) {
              response = await layers[0].getDataProxyFromServer('wms', { url, params, method, headers: { 'Content-Type': params.INFO_FORMAT } });
            } else if ('GET' === method) {
              let uri = (source.length ? source[0] : url).replace(/[?&]$/, ''); // remove any trailing ? or &
              response = await XHR.get({
                url: uri + (uri.indexOf('?') === -1 ? '?' : '&') + Object.keys(params)
                .filter(k => ![undefined, null].includes(params[k])) // skip null and undefined params
                .map(k =>k + '=' + encodeURIComponent(params[k]))
                .join('&')
              });
            } else if ('POST' === method) {
              response = await XHR.post({ url, data: params });
            } else {
              console.warn('unsupported method: ', method);
            }
            return {
              data: Layer._parse(layers[0].getInfoFormat(), {
                response,
                layers,
                wms:         true,
                projections: { map: projection, layer: null },
              }),
              query: { coordinates, resolution }
            };
          } finally {
            if (!proxy) {
              clearTimeout(timer)
            }
          }
        })(),
      ]);

    }
  },
  //backward compatibilities v3.11.6
  wfs: class {
    // query method
    query(opts = {}, params = {}) {
      const filter = opts.filter || {};
      const layers = opts.layers || [this._layer];
      const url    = `${layers[0].getQueryUrl()}/`.replace(/\/+$/, '/');
      const method = layers[0].getOwsMethod();

      // BACKCOMP v3.x
      Object.assign(filter, {
        config: filter.config || {},
        type:   filter._type || filter.type,
        value:  filter._filter || filter.value,
      })

      params = Object.assign(params, {
        SERVICE:      'WFS',
        VERSION:      '1.1.0',
        REQUEST:      'GetFeature',
        MAXFEATURES:  opts.feature_count ?? 10,
        TYPENAME:     layers.map(l => l.getWFSLayerName()).join(','),
        OUTPUTFORMAT: layers[0].getInfoFormat(),
        SRSNAME:      (opts.reproject ? layers[0].getProjection() : ApplicationState.project.getProjection()).getCode(),
        FILTER:       'all' !== filter.type ? `(${(
          new ol.format.WFS().writeGetFeature({
            featureTypes: [''], //v3.11.0 @TODO need to check https://openlayers.org/en/v5.3.0/apidoc/module-ol_format_WFS-WFS.html#writeGetFeature
            filter:       ({
              'bbox':       () => ol.format.filter.bbox('the_geom', filter.value),
              'geometry':   () => ol.format.filter[filter.config.spatialMethod || 'intersects']('the_geom', filter.value),
              'expression': () => null,
            })[filter.type](),
          })
        ).children[0].innerHTML})`.repeat(layers.length || 1) : undefined
      });

      let timer;

      // promise with timeout
      return Promise.race([
        new Promise(res => { timer = setTimeout(() => { res({
          data: (layers || []).map(layer => ({ layer, rawdata: 'timeout' })),
          query: {},
        }); }, TIMEOUT) }),
        (async () => {
          try {
            let response;

            if ('GET' === method && !['all', 'geometry'].includes(filter.type)) {
              response = await XHR.get({ url: url + '?' + new URLSearchParams(params || {}).toString() });
            }
  
            if ('POST' === method || ['all', 'geometry'].includes(filter.type)) {
              response = await XHR.post({ url, data: params })
            }

            const data = Layer._parse(layers[0].getInfoFormat(), {
              response,
              projections: {
                map:   ApplicationState.project.getProjection(),
                layer: (opts.reproject ? this._layer.getProjection() : null)
              },
              layers,
              wms: false,
            });

            // sanitize in case of nil:true
            data
              .flatMap(l => l.features || [])
              .forEach(f => Object.entries(f.getProperties())
                .forEach(([ attribute, value ]) => value && value['xsi:nil'] && feature.set(attribute, 'NULL'))
              );
            return { data };
          } finally {
            clearTimeout(timer)
          }
        })(),
      ]);

    }
  },
  //Changed based on https://github.com/g3w-suite/g3w-admin/issues/1070
  //@since 3.11.7
  g3w: class {
    async query(opts = {}, params = {}) {
      const filter = opts.filter || {};
      const spatialMethod = filter.config.spatialMethod || 'intersects';
      switch(filter.type) {
        case 'bbox':
        case 'geometry':
          params.geo_filter_mode = 'within' === spatialMethod ? 'contains' : spatialMethod;
          params.geo_filter_wkt  = (new ol.format.WKT({ dataProjection: ApplicationState.map.epsg, featureProjection: ApplicationState.map.epsg })).writeFeature(new ol.Feature({ geometry: filter.value }));
          params.formatter       = 1;
          params.filtertoken     = ApplicationState.tokens.filtertoken; // add filtertoken
          break;
        case 'expression':
          break;    
      }

      const data = [];

      try {
        const response = await XHR.post({ 
          url :  this._layer.getUrl('data'),
          contentType: 'application/json',
          data:        JSON.stringify(params),
         });
         if (response && response.result) {
          data.push({ 
            layer:    this._layer,
            features: Layer._parse('g3w-vector/json',
              response.vector && response.vector.data || {},
              { projections: { map: ApplicationState.project.getProjection() || this._layer.getProjection(), layer: null }}
            )
              .map(f => { f.set(G3W_FID, f.getId()); return f; }) //set g3w_fid to have G3W_FID property,
          })
         } else {
          throw response.error;
         }
      } catch(e) {
        console.warn(e);
      }

      return { data }
      
    }  
  }
};

/**
 * Base class for all layers
 */
export class Layer extends G3WObject {

  get config() {
    return this.state;
  }

  set config(value) {
    this.state = value;
  }
  
  /**
   * @param config.id
   * @param config.title
   * @param config.name
   * @param config.origname
   * @param config.multilayerid
   * @param config.servertype
   * @param config.source
   * @param config.crs
   * @param config.projection
   * @param config.bbox
   * @param config.capabilities
   * @param config.cache_url
   * @param { string } config.cache_provider since 3.10.0 (eg. "mapproxy")
   * @param config.baselayer
   * @param config.geometrytype
   * @param config.editops
   * @param config.expanded
   * @param config.fields
   * @param config.wmsUrl
   * @param config.infoformat
   * @param config.infourl
   * @param config.maxscale
   * @param config.minscale
   * @param config.visible
   * @param config.scalebasedvisibility
   * @param config.wfscapabilities
   * @param config.ows_method
   * @param config.wms_use_layer_ids
   * @param config.styles
   */
  constructor(config = {}, options = {}) {

    super();

    /**
     * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
     */
    this.setters = [
      'addFeature',
      'updateFeature',
      'setFeatures',
      'getFeatures',
      'commit',
      'change',
    ];

    this._BASE_LAYER   = options._BASE_LAYER;
    this._RASTER_LAYER = options._RASTER_LAYER;
    this.type          = options._TYPE;

    if (options._RASTER_LAYER) {
      this.state                  = config;
      this.iframe_internal        = config.iframe_internal || false;
      this.extent                 = config.extent;
      this.projection             = config.projection;
      this.layer                  = null;
      this.layers                 = config.layers || []; // store all enabled layers
      this.allLayers              = []; // store all layers
      this.showSpinnerWhenLoading = true;
      this.LAYERTYPE              = 'XYZ' !== this.state.type && { LAYER: 'layer', MULTILAYER: 'multilayer' };
      this.extraParams            = this._RASTER_LAYER?.params || {};
      this._method                = this._RASTER_LAYER?.method || 'GET';
      return;
    }

    // get current project
    const project   = options.project || ApplicationState.project;
    const suffixUrl = config.baselayer ? '' : `${project.getType()}/${project.getId()}/${config.id}/`;
    const vectorUrl = config.baselayer ? '' : project.state.vectorurl;
    const rasterUrl = config.baselayer ? '' : project.state.rasterurl;

    // default layer style (layerstree)
    const defaultstyle = config.styles && config.styles.find(s => s.current).name;

    /**
     * Global state
     * 
     * @TODO simplify further, some propertiy names seems to be duplicated
     */
    this.state = Object.assign(config, {
      id:        config.id || 'Layer',
      title:     config.title || config.name,
      download:  !!config.download,
      baselayer: !!config.baselayer,
      fields:    config.fields || {},

      // URLs to get various type of data
      urls:      {
        query: config.infourl || config.wmsUrl,
        ...(config.urls || {}),
        ...(config.baselayer ? {} : {
            filtertoken: `${vectorUrl}filtertoken/${suffixUrl}`,
            data:        `${vectorUrl}data/${suffixUrl}`,
            shp:         `${vectorUrl}shp/${suffixUrl}`,
            csv:         `${vectorUrl}csv/${suffixUrl}`,
            xls:         `${vectorUrl}xls/${suffixUrl}`,
            gpx:         `${vectorUrl}gpx/${suffixUrl}`,
            gpkg:        `${vectorUrl}gpkg/${suffixUrl}`,
            geotiff:     `${rasterUrl}geotiff/${suffixUrl}`,
            editing:     `${vectorUrl}editing/${suffixUrl}`,
            commit:      `${vectorUrl}commit/${suffixUrl}`,
            config:      `${vectorUrl}config/${suffixUrl}`,
            unlock:      `${vectorUrl}unlock/${suffixUrl}`,
            widget:      {
              unique: `${vectorUrl}widget/unique/data/${suffixUrl}`
            },
            /** @since 3.8.0 */
            featurecount:         project.getUrl('featurecount'),
            editorformstructure : project.getUrl('editorformstructure'),
            /** @since 3.10.0 */
            pdf:         `/html2pdf/`,
          })
      },

      /** Custom parameters based on a project qgis version */
      ...(config.baselayer ? {} : { searchParams: { I: 0, J: 0 } }),

      /** @deprecated since 3.10.0. Will be removed in v.4.x. */
      search_endpoint: 'api',

      map_crs:            project.getProjection()?.getCode(),
      multilayerid:       config.multilayer,
      projection:         config.projection ? (config.projection.getCode() === config.crs.epsg ? config.projection : ApplicationState.projections.get(config.crs)) : undefined,
      attributions:       config.attributions,
      selected:           config.selected || false,
      disabled:           config.disabled || false,
      metadata:           config.metadata,
      removable:          config.removable || false,
      source:             config.source,
      styles:             config.styles,
      defaultstyle,
      infoformats:        config.infoformats || [],
      projectLayer:       true,
      geolayer:           "NoGeometry" !== config.geometrytype,
      attributetable:     { pageLength: null },
      visible:            !!config.visible,
      tochighlightable:   false,

      /** state of if is in editing (setted by editing plugin) */
      inediting:          false,

      /** Reactive selection attribute */
      selection:          { active: false },

      /** Open layer features (key = fid, value = feature object) */
      ol_selection: {},

      /** selections feature `fids` */
      selectionFids: new Set(),

      /** Reactive filter attribute */
      filter: {
        active:     false,
        /** @since 3.9.0 whether filter is set from a previously saved filter */
        current:    null,
        /** @since v3.11.0 **/
        pagination: false,
      },

      /** @type { Array<{{ id: string, name: string }}> } since 3.9.0 - array of saved filters */
      filters:            config.filters || [],

      /** @type {number} since 3.8.0 */
      featurecount:       config.featurecount,

      /** @type { boolean | Object<number, number> } since 3.8.0 */
      stylesfeaturecount: config.featurecount && defaultstyle && { [defaultstyle]: config.featurecount },

      /** @type { string } since 3.10.0 */
      name:               config.name,

      /** @type { number } legend item state (expandend or collapsed) in catalog layers (TOC) (since 3.10.0) */
      expanded:           config.expanded,

      /** @type { boolean } since 3.10.0 - whether to show layer on TOC (default: true) */
      toc:                config.toc ?? true,

      /** @since 4.0.0 */
      legend: {
        url:     null,
        loading: false,
        error:   false,
        /** @deprecated since 3.8. Will be removed in 4.x. Use `expanded` attribute instead */
        show:    true,
        /** used when categories changed (checkbox on TOC) and legend is on TAB */
        change:  false,
        categories: {},
      },

      /** @type { boolean } since 4.0.0 */
      exclude_from_legend: config.exclude_from_legend ?? true,

      /** @type { boolean } whether has more than one category's legend (since 4.0.0) */
      categories: false,

      /** @since 4.0.0 */
      external:             config.source && config.source.external,

      /** @since 4.0.0 */
      bbox:                 config.bbox,

      /** @since 4.0.0 checked config attribute is passed by vector layer on editing */
      checked:              config.checked ?? !!config.visible,

      /** @since 4.0.0 */
      epsg:                 config.crs.epsg,

      /** @since 4.0.0 */
      hidden:               !!config.hidden,

      /** @since 4.0.0 */
      scalebasedvisibility: !!config.scalebasedvisibility,

      /** @since 4.0.0 */
      minscale:             config.minscale,

      /** @since 4.0.0 */
      maxscale:             config.maxscale,

      /** @since 4.0.0 */
      ows_method:           config.ows_method,
   
      /** @type {number} opacity range = [0, 100] (since 3.8) */
      opacity: config.opacity || 100,

      /** cached proxy params (eg. external wms server) */
      proxyData: { wms: null },

      /** @since 4.0.0 @type {number } number of preview fields on result */
      max_preview_fields: config.max_preview_fields, 
    });

    const relations = project.getRelations().filter(r => [r.referencedLayer, r.referencingLayer].includes(this.getId()));

    /**
     * Layer relations
     */
    this._relations = {

      /**
       * ORIGINAL SOURCE: src/app/core/relations/relation.js@v3.10.1
       * 
       * Relations store
       * 
       * @type { Relation[] }
       */
      _relations: (relations || []).reduce((relations, config = {}) => {
        const suffix = Date.now();
        /** relation state */
        const state = {
          /** @type { boolean } loading state (for editing purpose) */
          loading:     false,
          /** @type { string } relation id */ 
          id:          config.id       || `id_${suffix}`,
          /** @type { string } relation name */ 
          name:        config.name     || `name_${suffix}`,
          origname:    config.origname || `origname_${suffix}`,
          /** @type { string[] } layerId of father relation */
          father:      config.referencedLayer,
          /** @type { string[] } layerId of child relation */
          child:       config.referencingLayer,
          /** @type { 'MANY' | ONE' | string } relation type */
          type:        config.type,
          /** @since 3.9.0 */
          editable:    config.editable || false,
          /** @type { string } relation prefix (for Relation 1:1) @since 3.9.0 */
          prefix:      config.prefix,
          /** BACKCOMP (g3w-admin < v.3.7.0) - father relation field name */
          fatherField: [].concat(config.fieldRef.referencedField),
          /** BACKCOMP (g3w-admin < v.3.7.0) - child relation layer field name */
          childField:  [].concat(config.fieldRef.referencingField),
        }
        relations[state.id] = Object.assign(new G3WObject(config), {
          state,
          getId:          () => state.id,
          setId:          id => state.id = id,
          getName:        () => state.name,
          setName:        n   => state.name = n,
          getChild:       () => state.child,
          getFather:      () => state.father,
          getState:       () => state,
          getType:        () => state.type,
          getFatherField: () => state.fatherField,
          getChildField:  () => state.childField,
          setLoading:     b  => state.loading = !!b,
          isLoading:      () => state.loading,
          isEditable:     () => state.editable,
          getPrefix:      () => state.prefix,
          /** @returns {{ father, child }} relation fields */
          getFields:      () => ({ father: state.fatherField, child: state.childField, }),
          /** @FIXME `state.title` is not defined */
          getTitle:       () => state.title,
          /** @FIXME `state.title` is not defined */
          setTitle:       t => state.title = t,
        });
        return relations;
      }, {}),

      /**
       * Number of relations
       * 
       * @type { number }
       */
      _length: relations ? relations.length : 0,

      /**
       * Build relations between layers.
       *
       * @private
       */
      _reloadRelationsInfo() {

        this._relationsInfo = {
          children:     {},     // hashmap: <child_layerId,  Array<father_relationId>>
          fathers:      {},     // hashmap: <father_layerId, Array<child_relationId[]>>
          father_child: {},     // hashmap: <relationKey, relationId>
        };

        let f, c;
        const { father_child, fathers, children } = this._relationsInfo;

        Object
          .entries(this._relations)
          .forEach(([relationKey, relation]) => {

            f = relation.getFather();
            c = relation.getChild();

            father_child[f + c] = relationKey;       // relationKey = [father_layerId + child_layerId]
            fathers[f]          = fathers[f]  || [];
            children[c]         = children[c] || [];

            fathers[f].push(c);
            children[c].push(f);
        });
      },

      /**
       * @returns { number } number of relations
       */
      getLength() {
        return this._length;
      },

      /**
       * @param relation.type
       *
       * @returns { {} | Relation[] } relations filtered by type
       */
      getRelations({ type = null, } = {}) {

        // type = null
        if (!type) {
          return this._relations;
        }

        // type = { 'ONE' | 'MANY' }
        if (-1 !== ['ONE','MANY'].indexOf(type)) {
          const relations = {};
          for (const name in this._relations) {
            if (type === this._relations[name].getType()) {
              relations[name] = this._relations[name];
            }
          }
          return relations;
        }

        return {};
      },

      setRelations(relations=[])                 { this._relations = Array.isArray(relations) ? relations : []; },
      getRelationById(id)                        { return this._relations[id]; },
      getArray()                                 { return Object.entries(this._relations).map(r => r[1]); },
      getRelationByFatherChildren(father, child) { return this.getRelationById(this._relationsInfo.father_child[father + child]); },
      isChild(id)                                { return !!this._relationsInfo.children[id]; },
      isFather(id)                               { return !!this._relationsInfo.fathers[id]; },
      hasChildren(layer_id)                      { return (this.getChildren(layer_id) || []).length > 0; },
      hasFathers(layer_id)                       { return (this.getFathers(layer_id) || []).length > 0; },
      /** @returns { Array | null } child layers (IDs) within same relation */
      getChildren(layer_id)                      { return this.isFather(layer_id) ? this._relationsInfo.fathers[layer_id] : null; },
      /** @returns { Array | null } father layers (IDs) within same relation */
      getFathers(layer_id)                       { return this.isChild(layer_id) ? this._relationsInfo.children[layer_id] : null; },

    };

    this._relations._reloadRelationsInfo();

    Object.assign(this.state, {
      openattributetable: this.canShowTable(),
      downloadable:       this.isDownloadable(),
      infoformat:         this.getInfoFormat(),
    });

    // referred to (layersstore);
    this._layersstore = config.layersstore || null;

    const layerType = `${this.state.servertype} ${this.state.source && this.state.source.type}`;

    /**
     * Layer providers used to retrieve layer data from server
     * 
     * 1 - data: raw layer data (editing)
     * 2 - filter
     * 3 - filtertoken
     * 4 - query
     * 5 - search
     */
    this.providers = {

      data: (() => {
        if ([
          'QGIS virtual',
          'QGIS postgres',
          'QGIS oracle',
          'QGIS mssql',
          'QGIS spatialite',
          'QGIS ogr',
          'QGIS delimitedtext',
          'QGIS wfs',
        ].includes(layerType)) {
          return createProvider('qgis', this);
        }
        if ('G3WSUITE geojson' === layerType) {
          return createProvider('geojson', this);
        }
      })(),

      filter: [
        'QGIS virtual',
        'QGIS postgres',
        'QGIS oracle',
        'QGIS mssql',
        'QGIS spatialite',
        'QGIS ogr',
        'QGIS delimitedtext',
        'QGIS wfs',
        'QGIS wmst',
        'QGIS wcs',
        'QGIS wms',
        "QGIS arcgisfeatureserver",
      ].includes(layerType) && createProvider('g3w', this),

      filtertoken: [
        'QGIS virtual',
        'QGIS postgres',
        'QGIS oracle',
        'QGIS mssql',
        'QGIS spatialite',
        'QGIS ogr',
        'QGIS delimitedtext',
      ].includes(layerType) && createProvider('qgis', this),

      query: (() => {
        if ([
          'QGIS virtual',
          'QGIS postgres',
          'QGIS oracle',
          'QGIS mssql',
          'QGIS spatialite',
          'QGIS ogr',
          'QGIS delimitedtext',
          'QGIS wfs',
          'QGIS wmst',
          'QGIS wcs',
          'QGIS wms',
          'QGIS gdal',
          /** @since 3.9.0 */
          'QGIS postgresraster',
          'QGIS vector-tile',
          'QGIS vectortile',
          'QGIS arcgismapserver',
          'QGIS arcgisfeatureserver', //@since 4.0.0
          'QGIS mdal',
          'OGC wms',
        ].includes(layerType)) {
          return createProvider('wms', this);
        }
        if ('G3WSUITE geojson' === layerType) {
          return createProvider('geojson', this);
        }
      })(),

      search: [
        'QGIS virtual',
        'QGIS postgres',
        'QGIS oracle',
        'QGIS mssql',
        'QGIS spatialite',
        'QGIS ogr',
        'QGIS delimitedtext',
        'QGIS wfs',
        "QGIS arcgisfeatureserver",
      ].includes(layerType) && createProvider('qgis', this),

    };

    // sanitize source url (ie. discard any reserved WMS params)
    if (config?.source?.url) {
      const url = new URL(this.state.source.url);
      ['VERSION', 'REQUEST', 'BBOX', 'LAYERS', 'WIDTH', 'HEIGHT', 'DPI', 'FORMAT', 'CRS' ].forEach(p => {
        this.state.source.url = this.state.source.url
          .replace(`${p.toUpperCase()}=${url.searchParams.get(p.toUpperCase())}`, '')
          .replace(`${p.toLowerCase()}=${url.searchParams.get(p.toLowerCase())}`, '');
      });
    }

    /**
     * @since 4.1.0
     */
    this._color = null;

    /**
     * @TODO check if unusued
     * 
     * @since 4.1.0
     */
    this.layerId = config.id;

    /**
     * Feature wrapper (to store feature)
     * 
     * ORIGINAL SOURCE: g3w-client/src/map/layers/featuresstore.js@v4.0.0
     * 
     * @since 4.1.0
     */
    this._featuresstore = Object.assign(new G3WObject, {
      _features: [],
      _loadedIds: [], // store features id load by current user
      _lockIds: [], // store locked features
      setters: {
        addFeatures(features = []) { features.forEach(f => this._features.push(f)) },
        removeFeature(feature)     { this._features = this._features.filter(f => feature.getUid() !== f.getUid()) },
        updateFeature(feature)     { this._features.find((feat, idx) => { if (feature.getUid() === feat.getUid() ) { this._features[idx] = feature; return true; } }); },
        clear()                    { this._features  = null; this._features  = []; this._lockIds   = []; this._loadedIds = []; },
      },
      addFeature(feature)        { this._features.push(feature); },
      clone()                    { return cloneDeep(this); },
      getProvider:               () => this.getProvider('data'),
      unlock:              async () => await XHR.post({ url: this.getProvider('data')._layer.getUrl('unlock') }),
      getLockIds()               { return this._lockIds; },
      getFeatureById(id)         { return this._features.find(f => id == f.getId()); },
      setFeatures(features = []) { this._features = features; },
      readFeatures()             { return this._features; },
      commit: async (commitItems, featurestore)=> {
        if (commitItems && this.getProvider('data')) {
          commitItems.lockids = this._featuresstore._lockIds;
          return await XHR.post({
            url:         this.getProvider('data')._layer.getUrl('commit'),
            data:        JSON.stringify(commitItems),
            contentType: 'application/json',
          });
        }
        return Promise.reject();
      },
    });


    this.customParams = {};

  }

  /******************************************************************************************
   * LAYER DOWNLOAD
   *****************************************************************************************/

  /** 
   * @since 4.1.0
   */
  async downloadAsFile(type, { data = {} }) {
    data.filtertoken = this.getFilterToken();

    let url, response;
    switch(type) {
      case 'pdf':
        url       = this.getUrl('pdf');
        response  = url && await fetch(url, {
          body:    JSON.stringify(data),
          method:  'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Expose-Headers': 'Content-Disposition' },
          signal:  AbortSignal.timeout(TIMEOUT),
        });
        break;
      default:
        url       = this.getUrl('shapefile' === type ? 'shp' : type);
        response  = url && await fetch(url, {
          body:     Object.keys(data || {}).reduce((a, k) => { a.append(k, data[k]); return a; }, new FormData()),
          method:  'POST',
          headers: { 'Access-Control-Expose-Headers': 'Content-Disposition' }, // get filename from server
          signal:  AbortSignal.timeout(TIMEOUT),
        });
        break;
    }

    if (!response?.ok) {
      throw (await response.json()).message;
    }

    saveBlob(await response.blob(), response.headers.get('content-disposition'));

  }

  getGeoTIFF({ data = {} } = {}) { return this.downloadAsFile('geotiff',   { data }); }
  getXls({ data = {} } = {})     { return this.downloadAsFile('xls',       { data }); }
  getShp({ data = {} } = {})     { return this.downloadAsFile('shapefile', { data }); }
  getGpx({ data = {} } = {})     { return this.downloadAsFile('gpx',       { data }); }
  getGpkg({ data = {} } = {})    { return this.downloadAsFile('gpkg',      { data }); }
  getCsv({ data = {} } = {})     { return this.downloadAsFile('csv',       { data }); }

  /**
   * @returns { string[] } download formats
   */
  getDownloadableFormats()  { return Object.keys(DOWNLOAD_FORMATS).filter(d => this.state[d]).map(d => DOWNLOAD_FORMATS[d].format); }

  /**
   * @returns { boolean } whether at least one layer has a download format not equal to pdf
   * 
   * @since 3.11.7  
   */
  hasDowloadableRelations() { 
    return this.getRelations().getArray().length > 0 && !!this.getRelations().getArray().find(r => getCatalogLayerById(r.getChild()).getDownloadableFormats().filter(f => 'pdf' !== f).length > 0); }

  /**
   * @param download url
   * 
   * @returns { string }
   */
  getDownloadUrl(format) {
    return (Object.values(DOWNLOAD_FORMATS).find(d => d.format === format) || {}).url;
  }

  /**
   * @returns { boolean } whether it has a format to download
   */
  isDownloadable()        { return !!(this.getDownloadableFormats().length); }
  isGeoTIFFDownloadable() { return !this.isBaseLayer() && this.state.download && 'gdal' === this.state.source.type ; }
  isShpDownloadable()     { return !this.isBaseLayer() && this.state.download && 'gdal' !== this.state.source.type; }
  isXlsDownloadable()     { return !this.isBaseLayer() && !!this.state.download_xls; }
  isGpxDownloadable()     { return !this.isBaseLayer() && !!this.state.download_gpx; }
  isGpkgDownloadable()    { return !this.isBaseLayer() && !!this.state.download_gpkg; }
  isCsvDownloadable()     { return !this.isBaseLayer() && !!this.state.download_csv; }

  /******************************************************************************************
   * LAYER RELATIONS
   *****************************************************************************************/

  /**
   * @returns {*} relations
   */
  getRelations() {
    return this._relations;
  }

  /**
   * @param id
   * 
   * @returns {*} relation by id
   */
  getRelationById(id) {
    return this._relations.getArray().find(r => id === r.getId());
  }

  /**
   * @param relationName
   * 
   * @returns { * | Array } relation fields
   */
  getRelationAttributes(relationName) {
    const relation = this._relations.find(r => relationName === r.name);
    return relation ? relation.fields : [];
  }

  /**
   * [LAYER RELATIONS]
   * 
   * @TODO Add description
   * 
   * @returns { Object } fields
   */
  getRelationsAttributes() {
    return (this.state.relations || []).reduce((fields, r) => {
      fields[r.name] = r.fields;
      return fields; },
    {});
  }

  /**
   * @returns { * | boolean } whether layer is a Child of a relation
   */
  isChild() {
    return this.getRelations() ? this._relations.isChild(this.getId()) : false;
  }

  /**
   * @returns { * | boolean } whether layer is a Father of a relation
   */
  isFather() {
    return this.getRelations() ? this._relations.isFather(this.getId()) : false;
  }

  /**
   * @returns { * |Array } children relations
   */
  getChildren() {
    return this.isFather() ? this._relations.getChildren(this.getId()) : [];
  }

  /**
   * @returns { * | Array } parents relations
   */
  getFathers() {
    return this.isChild() ? this._relations.getFathers(this.getId()) : [];
  }

  /**
   * @returns { * | boolean } whether it has children
   */
  hasChildren() {
    return this.hasRelations() ? this._relations.hasChildren(this.getId()) : false;
  }

  /**
   * @returns { * | boolean } whether it has fathers
   */
  hasFathers() {
    return this.hasRelations() ? this._relations.hasFathers(this.getId()) : false;
  }

  /**
   * @TODO add description
   */
  hasRelations() {
    return !!this._relations;
  }

  /******************************************************************************************
   * LAYER SELECTION
   *****************************************************************************************/

  /**
   * @returns { boolean } whether is selected
   */
  isSelected() {
    return this.state.selected;
  }

  /**
   * @param { boolean } selected
   */
  setSelected(selected) {
    this.state.selected = selected;
  }

  /**
   * Set Selection
   * 
   * @param bool
   * 
   * @returns {Promise<void>}
   * 
   * @fires unselectionall
   */
  async setSelection(bool = false) {
    this.state.selection.active = bool;

    // skip when selection is active
    if (bool) { return }

    //check if filter is active
    const is_active   = this.state.filter.active;
    const has_current = null !== this.state.filter.current;

    /** @TODO add description */
    if (has_current && is_active) {
      await this._applyFilterToken(this.state.filter.current)
    }

    /** @TODO add description */
    if (!has_current && is_active) {
      await this.deleteFilterToken();
    }

    this.emit('unselectionall', this.getId());
  }

  /**
   * @returns { boolean } whether selection si active
   */
  isSelectionActive() {
    return this.state.selection.active;
  }

  /**
   * @returns {{ active: boolean }} selection
   */
  getSelection() {
    return this.state.selection;
  }

  /**
   * @returns filter
   */
  getFilter() {
    return this.state.filter;
  }

  /**
   * Set filter Active to layer
   * 
   * @param {boolean} bool
   */
  setFilter(bool = false) {
    this.state.filter.active     = bool;
    if (this.isGeoLayer() && this.state.filter.active) {
      GUI.getService('map').toggleSelection(false, this.state.id); // hide selection features (open layers)
    }
    if (this.isGeoLayer() && !this.state.filter.active) {
      this.#updateOlSelection(); // update selection features (open layers)
    }
  }

  /**
   * Apply layer filter by fid
   * 
   * @param filter
   */
  async applyFilter(filter) {
    if (!this.providers['filtertoken']) {
      return;
    }

    // the current filter is set and is different from current
    if (null === this.state.filter.current || filter.fid !== this.state.filter.current.fid ) {
      await this.clearSelectionFids();
      GUI.closeContent();
    }

    await this._applyFilterToken(filter);
  }

  /**
   * @returns {Promise<void>}
   * 
   * @private
   */
  async _applyFilterToken(filter) {
    try {
      /** @example /vector/api/filtertoken/<qdjango>/<project_id>/<qgs_layer_id>/mode=apply&fid=<fid_filter_saved>|name=<name_filter_saved> */
      const response = await XHR.get({
        url:    this.providers['filtertoken']._layer.getUrl('filtertoken'),
        params: { mode: 'apply', fid: filter.fid }
      });
      if (!response || !response.result || !response.data) {
        return;
      }
      this.setFilter(false);
      this.state.filter.current = filter;
      this.setFilterToken(response.data.filtertoken);
    } catch(e) {
      console.warn(e);
    }
  }

  /**
   * @since 3.9.0
   */
  saveFilter() {

    // skip when ..
    if (!this.providers['filtertoken'] || !this.state.selectionFids.size > 0) {
      return;
    }

    prompt({
      label: _('Save Filter'),
      value: this.state.filter.current?.name || '',
      callback: async(name) => {

        /** @example /vector/api/filtertoken/<qdjango>/<project_id>/<qgs_layer_id>/mode=save&name=<name_filter_saved> */
        const response = await XHR.get({
          url:    this.providers['filtertoken']._layer.getUrl('filtertoken'),
          params: { mode: 'save', name } }
        );

        // skip when no data return from provider
        if (!response || !response.result || !response.data) {
          return;
        }

        let filter = this.state.filters.find(f => response.data.fid === f.fid);
      
        // add saved filter to filters array
        if (undefined === filter) {
          filter = {
            fid:  response.data.fid, //get fid
            name: response.data.name //get name
          }
          this.state.filters.push(filter);
        }

        this.state.filter.current = filter; // set current filter
        this.setFilter(false);              // set to false
        this.getSelection().active = false; // reset selection to false
        this.state.selectionFids.clear();   // clear current fids

        // remove selection feature from map
        if (this.isGeoLayer()) {
          Object
            .values(this.state.ol_selection)
            .forEach(feat => {
              //remove selection feature
              if (feat.added) {
                GUI.getService('map').setSelectionFeatures('remove', { feature: feat.feature });
              }
              feat.added    = false;
              feat.selected = false;
            });
        }

        this.emit('unselectionall', this.getId());
      },
    });

  }

  /**
   * Toggle filter token on layer
   */
  async toggleFilterToken() {

    //set to handle select or hide ol
    this.setFilter(!this.state.filter.active);

    const has_current = this.state.filter.current;
    const is_active   = this.state.filter.active;

    // there is an active filter --> create a new filter
    if (is_active) {
      await this.createFilterToken();
    }

    // there is a current saved filter --> apply filter
    if (has_current && !is_active) {
      await this.applyFilter(this.state.filter.current);
    }

    // there is no current saved filter --> delete it
    if (!has_current && !is_active) {
      await this.deleteFilterToken();
    }

    return this.state.filter.active;
  }

  /**
   * Delete filtertoken from server
   * 
   * @param fid  unique id of filter saved to delete
   */
  async deleteFilterToken(fid) {
    try {
      // skip when no filtertoken provider is set
      if (!this.providers['filtertoken']) {
        return;
      }

      let filtertoken;
      try {
        // Delete saved filter from server --> `/vector/api/filtertoken/<qdjango>/<project_id>/<qgs_layer_id>/mode=delete_saved&fid=<fid_filter_saved>|name=<name_filter_saved>`
        // Delete current filter           --> `/vector/api/filtertoken/<qdjango>/<project_id>/<qgs_layer_id>/mode=delete`
        const response = await XHR.get({
          url:    this.providers['filtertoken']._layer.getUrl('filtertoken'),
          params: { fid, mode: undefined === fid ? 'delete': 'delete_saved' }
        });
        // filter token if another layer is filtered otherwise filtertoken is undefined
        if (response && response.result && response.data) {
          filtertoken = response.data.filtertoken;
        }
      } catch(e) {
        console.warn(e);
      }

      // remove it from filters list when deleting a saved filter (since v3.9.0)
      if (undefined !== fid) {
        this.state.filters = this.state.filters.filter(f => fid !== f.fid);
      }
      if (this.state.filter.active && this.state.filter.pagination) {
        this.state.selection.active  = false; //in case of pagination, set selected to false
      }
      this.state.filter.pagination = false; //set pagination to false
      this.state.filter.current    = null  // set current filter set to null
      this.setFilterToken(filtertoken); //set filtertoken 
      // set active filter to false
      if (this.state.filter.active) { this.setFilter(false) }
    } catch(e) {
      console.warn(e);
    }
  }

  /**
   * Set applicaton filter token
   * 
   * @param {string} filtertoken a string passed by server and used as parameter in XHR request
   *
   * @fires filtertokenchange when filtertoken is changed
   * 
   * @since 3.9.0
   */
  setFilterToken(filtertoken = undefined) {
    ApplicationState.tokens.filtertoken = filtertoken;
    this.setFilter(!!filtertoken);
    this.emit('filtertokenchange', { layerId: this.getId() });
  }

  /**
   * Create filter token
   */
  async createFilterToken() {
    try {

      const provider  = this.providers['filtertoken'];
      const selection = this.state.selectionFids;

      // skip when no filter token provider is set or selectionFids is empty
      if (!provider || !selection.size > 0) {
        return;
      }

      // select all features
      if (selection.has(SELECTION.ALL)) {
        try {
          // Delete current filter --> `/vector/api/filtertoken/<qdjango>/<project_id>/<qgs_layer_id>/mode=delete`
          await XHR.get({
            url:    this.providers['filtertoken']._layer.getUrl('filtertoken'),
            params: { fid: undefined, mode: 'delete' }
          });
        } catch(e) {
          console.warn(e)
        }
        this.setFilterToken(null);

        return;
      }

      const fids = Array.from(selection);

      const { data = {} } = await XHR.post({
        url:    provider._layer.getUrl('filtertoken'),
        contentType: 'application/json',
        data: JSON.stringify(selection.has(SELECTION.EXCLUDE)
          ? { fidsout: fids.filter(id => id !== SELECTION.EXCLUDE).join(',') } // exclude features from selection
          : { fidsin: fids.join(',') })                                   // include features in selection
      });

      this.setFilterToken(data.filtertoken);

    } catch(e) {
      console.warn(e);
    }
  }

  /**
   * Get Application filter token
   * 
   * @returns {*}
   */
  getFilterToken() {
    return this.state.filter.active ? ApplicationState.tokens.filtertoken : undefined;
  }

  /**
   * @TODO add description
   */
  setSelectionFidsAll() {
    this.state.selectionFids.clear();
    this.state.selectionFids.add(SELECTION.ALL);

    // select all features (open layers)
    if (this.isGeoLayer()) {
      Object.values(this.state.ol_selection).forEach(feat => feat.selected = true);
      this.#updateOlSelection();
    }

    /** @TODO add description */
    this.setSelection(true);
    if (this.state.filter.active) {
      this.createFilterToken();
    }
  }

  /**
   * @returns {Set<any>} stored selection `fids` 
   */
  getSelectionFids() {
    return this.state.selectionFids;
  }

  /**
   * Invert current selection fids
   */
  invertSelectionFids() {
    const selection = this.state.selectionFids;

    /** @TODO add description */
    if (selection.has(SELECTION.EXCLUDE))  { selection.delete(SELECTION.EXCLUDE); }
    else if (selection.has(SELECTION.ALL)) { selection.delete(SELECTION.ALL); }
    else if (selection.size > 0)           { selection.add(SELECTION.EXCLUDE); }

    // invert selection (state)
    if (this.isGeoLayer()) {
      const map = GUI.getService('map');
      Object
        .values(this.state.ol_selection)
        .forEach(f => {
          f.selected = !f.selected;
          if (f.selected !== f.added) {
            map.setSelectionFeatures(f.selected ? 'add' : 'remove', { feature: f.feature });
            f.added = f.selected;
          }
        });
    }

    /** In the case of tocken filter active create */
    if (this.state.filter.active) { this.createFilterToken() }

    this.setSelection(selection.size > 0);
  }

  /**
   * Check if feature id is present
   * 
   * @param fid feature id
   * 
   * @returns {boolean}
   */
  hasSelectionFid(fid) {
    const selection = this.state.selectionFids;

    /** In case contain selection ALL, mean all features selected */
    if (selection.has(SELECTION.ALL)) { return true }

    /**In case selection contains exclude value, check if id is not in excluded feature id */
    if (selection.has(SELECTION.EXCLUDE)) { return !selection.has(fid) }

    /** Check if id is on selection set */
    return selection.has(fid);
  }


  /**
   * Include fid feature id to selection
   * 
   * @param fid
   * @param createToken
   * 
   * @returns {Promise<void>}
   */
  async includeSelectionFid(fid, createToken = true) {

    const selection = this.state.selectionFids;

    // whether fid is excluded from selection
    const is_excluded = selection.has(SELECTION.EXCLUDE) && selection.has(fid);

    // remove fid from exclude
    if (is_excluded) { selection.delete(fid) }

    // add to selection fid
    if (!is_excluded) { selection.add(fid) }

    // if the only one exclude Set all selected
    if (is_excluded && 1 === selection.size) { this.setSelectionFidsAll() }

    /** @TODO add description */
    if (!is_excluded && !this.isSelectionActive()) { this.setSelection(true) }

    // update selection (state)
    if (this.isGeoLayer() && this.state.ol_selection[fid]?.feature) {
      this.state.ol_selection[fid].selected          = !is_excluded;
      this.state.ol_selection[fid].feature.__layerId = (!is_excluded && !this.state.ol_selection[fid].added) ? this.getId() : undefined; // <-- used when working with selected Layer features
      this.#updateOlSelection();
    }

    /** @TODO add description */
    if (createToken && this.state.filter.active) {
      await this.createFilterToken();
    }

  }

  /**
   * Exclude fid to selection
   * 
   * @param fid
   * @param createToken
   * 
   * @returns {Promise<void>}
   */
  async excludeSelectionFid(fid, createToken = true) {

    const selection = this.state.selectionFids;

    /**In case all features are selected or no features are selected */
    if (selection.has(SELECTION.ALL) || 0 === selection.size) {
      //set an empty selection set
      selection.clear();
      //add exclude item
      selection.add(SELECTION.EXCLUDE);
    }


    /** If has exclude item, mean add fid to exclude */
    if (selection.has(SELECTION.EXCLUDE)) {
      //add to exclude
      selection.add(fid);
    } else {
      //remote to exclude
      selection.delete(fid);
    }

    /** If no selection */
    if (0 === selection.size) { this.clearSelectionFids() }

    /** If contain only exclude fid */
    if (1 === selection.size && selection.has(SELECTION.EXCLUDE)) {
      //celar selection set
      selection.clear();
      this.setselectionFidsAll();
    }

    const is_excluded = selection.has(SELECTION.EXCLUDE) ? selection.has(fid) : !selection.has(fid);

    // update selection (state)
    if (this.isGeoLayer() && this.state.ol_selection[fid]?.feature) {
      this.state.ol_selection[fid].selected          = !is_excluded;
      this.state.ol_selection[fid].feature.__layerId = (!is_excluded && !this.state.ol_selection[fid].added) ? this.getId() : undefined; // <-- used when working with selected Layer features
      this.#updateOlSelection();
    }

    /** If there is a filterActive */
    if (createToken && this.state.filter.active) {
      await this.createFilterToken();
    }

  }

  /**
   * Clear selection
   */
  async clearSelectionFids() {
    //clear all selection fids from set
    this.state.selectionFids.clear();
    // unselect all features (open layers)
    if (this.isGeoLayer()) {
      //set false selection
      Object.values(this.state.ol_selection).forEach(feat => feat.selected = false);
      //update selection
      this.#updateOlSelection();
    }
    // set selection false
    await this.setSelection(false);
  }

  /******************************************************************************************
   * LAYER BASE
   *****************************************************************************************/

  /**
   * Proxy params data
   */
  getProxyData(type) {
    return type ? this.state.proxyData[type] : this.state.proxyData;
  }

  /**
   * Set proxy data
   *
   * @param type
   * @param data
   */
  setProxyData(type, data = {}) {
    this.state.proxyData[type] = data;
  }

  /**
   * Clear proxy data
   *
   * @param type
   */
  clearProxyData(type) {
    this.state.proxyData[type] = null;
  }

  /**
   * Get a proxy request
   *
   * @param type
   * @param proxyParams
   *
   * @returns {Promise<*>}
   */
  async getDataProxyFromServer(type = 'wms', proxyParams = {}) {
    try {
      const { response, data } = await DataRouterService.getData(`proxy:${type}`, {
        inputs:  proxyParams,
        outputs: false,
      });
      this.setProxyData(type, JSON.parse(data));
      return response;
    } catch(e) {
      console.warn(e);
    }
  }

  /**
   * @TODO Add description
   *
   * @param type
   * @param changes
   *
   * @returns {Promise<*>}
   */
  changeProxyDataAndReloadFromServer(type = 'wms', changes = {}) {
    Object.keys(changes).forEach(c => {
      Object.keys(changes[c]).forEach(p => {
        this.state.proxyData[type][c][p] = changes[c][p];
      })
    });
    return this.getDataProxyFromServer(type, this.state.proxyData[type]);
  }

  /**
   * [EDITING PLUGIN] Check if layer is in editing
   *
   * @returns { boolean }
   */
  isInEditing() {
    return this.state.inediting;
  }

  /**
   * [EDITING PLUGIN] Set editing state
   *
   * @param {boolean} bool
   */
  setInEditing(bool = false) {
    this.state.inediting = bool;
  }

  /**
   * @TODO Add description here
   *
   * @returns {*}
   */
  getSearchParams() {
    return this.state.searchParams;
  }

  /**
   * @TODO Add description
   *
   * @param pageLength
   */
  setAttributeTablePageLength(pageLength) {
    this.state.attributetable.pageLength = pageLength
  }

  /**
   * @TODO add description
   *
   * @returns {null}
   */
  getAttributeTablePageLength() {
    return this.state.attributetable.pageLength;
  }

  /**
   * @returns {*|null} source type of layer
   */
  getSourceType() {
    return this.state.source ? this.state.source.type : null;
  }

  /**
   * @returns {boolean} whether it is a layer with geometry
   */
  isGeoLayer() {
    return this.state.geolayer;
  }

  /**
   * @TODO Add description
   *
   * @param { Object } opts
   * @param opts.page
   * @param opts.page_size
   * @param opts.ordering
   * @param opts.search
   * @param opts.suggest
   * @param opts.formatter
   * @param opts.custom_params
   * @param opts.field
   * @param opts.in_bbox
   *
   * @returns {*}
   */
  async getDataTable({
    page          = null,
    page_size     = null,
    ordering      = null,
    search        = null,
    suggest       = null,
    formatter     = 0,
    custom_params = {},
    field,
    in_bbox,
  } = {}) {
    // skip when..
    if (!this.getProvider('filter') && !this.getProvider('data')) {
      return Promise.reject();
    }

    const response = await (
      this
        .getProvider('data')
        .getFeatures(
          { editing: false }, {
          ...custom_params,
          field,
          page,
          page_size,
          ordering,
          search,
          formatter,
          suggest,
          in_bbox,
          filtertoken: this.getFilterToken()
        })
    );

    const features          = response.data.features && response.data.features || [];
    const layerAttributes   = this.getAttributes() || [];
    const featureAttributes = (features.length ? features[0].properties : []);

    return {
      features,
      headers: (layerAttributes && layerAttributes.length > 0)
      ? layerAttributes.filter(attr => Object.keys(featureAttributes).indexOf(attr.name) > -1)
      : Object
          .keys(featureAttributes)
          .filter(name => -1 === GEOMETRY_FIELDS.indexOf(name))
          .map(name => ({ name, label: name })),
      title: this.getTitle(),
      count: response.count
    };
  }

  /**
   * Search layer feature by fids
   *
   * @param fids
   * @param formatter
   */
  async getFeatureByFids({
    fids      = [],
    formatter = 0,
  } = {}) {
    const url = this.getUrl('data');
    try {
      const response = await XHR.get({
        url,
        params: {
          fids: fids.toString(),
          formatter
        }
      });
      if (response && response.result && response.vector && response.vector.data) {
        return response.vector.data.features;
      }
    } catch(e) {
      console.warn(e);
    }
  }

  /**
   * @TODO deprecate `search_endpoint = 'ows'`
   *
   * Search Features
   * 
   * @param { Object }        options
   * @param { 'ows' | 'api' } options.search_endpoint
   * @param { boolean }       options.raw
   * @param { 0 | 1 }         options.formatter
   * @param options.filter
   * @param options.suggest
   * @param options.unique
   * @param options.queryUrl
   * @param options.ordering
   * @param options.autofilter //@since 3.11.0
   * @param { Object }        params - OWS search params
   * 
   * @returns { Promise }
   */
  searchFeatures(options = {}, params = {}) {
    const {
      search_endpoint = this.state.search_endpoint,
    } = options;

    return new Promise(async (resolve, reject) => {
      switch (search_endpoint) {

        case 'ows':
          this
            .search(options, params)
            .then(results => { resolve(({ data: results })); })
            .catch(e => { console.warn(e); reject(e) });
          break;

        case 'api':
          try {
            resolve(
              await this.getFilterData({
                queryUrl:  options.queryUrl,
                field:     options.filter,
                ordering:  options.ordering,
                unique:    options.unique,
                raw:       undefined !== options.raw       ? options.raw       : false,
                suggest:   options.suggest,
                /** @since 3.9.0 */
                formatter: undefined !== options.formatter ? options.formatter : 1,
                /** @since 3.11.0 */
                autofilter: options.autofilter,
                page:       options.page,
                page_size:  options.page_size,
              })
            );
          } catch(e) {
            console.warn(e);
            reject(e);
          }
          break;
      }
    })
  }

  /**
   * Get feature data based on `field` and `suggests`
   * 
   * @param { Object }    opts
   * @param { boolean }   opts.raw
   * @param { Object }    opts.suggest   - (mandatory): object with key is a field of layer and value is value of the field to filter
   * @param { 0 | 1 }     opts.formatter
   * @param { Array }     opts.field     - Array of object with type of suggest (see above)
   * @param opts.unique
   * @param opts.fformatter  since 3.9.0
   * @param opts.ffield      since 3.9.1
   * @param opts.queryUrl
   * @param opts.ordering

  */
  async getFilterData({
    raw       = false,
    suggest,
    field,
    unique,
    fformatter, //@since v3.9
    ffield,     //@since 3.9.1
    formatter = 1,
    queryUrl,
    ordering,
    autofilter, //@since 3.11.0
    page,  //@since 3.11.0
    page_size, //@since 3.11.0
  } = {}) {
    const provider        = this.getProvider('data');
    provider._projections = provider._projections || { map: null, layer: null };
    const params   =  {
      field,
      suggest,
      ordering,
      formatter,
      unique,
      fformatter,
      ffield,
      filtertoken: ApplicationState.tokens.filtertoken,
      autofilter,
      page,
      page_size,
    };
    try {
      const url = queryUrl ? queryUrl : provider._layer.getUrl('data');
      const response =  await XHR.post({ url, contentType: 'application/json', data: JSON.stringify(params)}); // since g3w-admin@v3.7
      // vector layer
      if ('table' !== provider._layer.getType()) {
        provider._projections.map = ApplicationState.project.getProjection() || provider._projections.layer;
      }

      if (raw)                           { return response }
      if (unique && response.result)     { return response.data }
      if (fformatter && response.result) { return response }

      if (response.result) {
        return {
          data: Layer._parse('application/json', {
            layers:      [provider._layer],
            response:    response.vector.data,
            filtertoken: response.filtertoken, //@since v3.11.0 returned filtertoken in case of autofilter request
            projections: provider._projections,
          }),
          count: response.vector.count, //@since v3.11.0 take in account feature count (all). It use for pagination purpose
        }
      }

    } catch(e) {
      console.warn(e);
      return Promise.reject(e);
    }
    return Promise.reject();
  }

  /**
   * search method 
   */
  async search(options = {}, params = {}) {
    options = {
      ...options,
      feature_count: options.feature_count || 10,
      ...this.state.searchParams,
      ...params
    };
    const provider = this.getProvider('search');
  
    if (provider) {
      return await provider.query(options);
    }
    return Promise.reject(_('Layer is not searchable'));
    
  }

  /**
   * Info from layer (only for querable layers) 
   */
  async query(options = {}) {
    const provider = this.getProvider(options.filter ? 'filter' : 'query');
    if (provider) {
      return await provider.query(options);
    }
    return Promise.reject(_('Layer is not querable'));
  }

  /**
   * General way to get an attribute 
   */
  get(property) {
    return this.state[property];
  }

  /**
   * @returns { * | {} } layer fields
   */
  getFields() {
    return this.state.fields
  }

  /**
   * @returns { Array } only show fields
   */
  getTableFields() {
    return (this.state.fields || []).filter(f => f.show);
  }

  /**
   * @returns { Array } table fields exclude geometry field
   */
  getTableHeaders() {
    return this.getTableFields().filter(f => !GEOMETRY_FIELDS.includes(f.name));
  }

  /**
   * @returns {*} current project
   */
  getProject() {
    return this.state.project;
  }

  /**
   * @returns { Object } layer config
   */
  getConfig() {
    return this.state;
  }

  /**
   *
   * @returns { Array } form structure to show on form editing
   */
  getLayerEditingFormStructure() {
    return this.state.editor_form_structure;
  }

  /**
   * @returns { boolean } whether it has form structure
   */
  hasFormStructure() {
    return !!this.state.editor_form_structure;
  }

  /**
   * @returns custom style (for future implementation)
   */
  getCustomStyle() {
    return this.state.customstyle;
  }

  /**
   * Get state layer
   *
   * @returns {*|{metadata, downloadable: *, attributetable: {pageLength: null}, defaultstyle: *, source, title: *, infoformats: ((function(): *)|*|*[]), tochighlightable: boolean, featurecount: number, stylesfeaturecount: (number|string|*|{[p: number]: *}), projectLayer: boolean, infoformat: (string|default.watch.infoformat|*), geolayer: boolean, inediting: boolean, disabled: boolean, id: (*|string), selected: boolean, openattributetable: (boolean|boolean), visible: boolean, filters: *[], filter: {current: null, active: boolean}, selection: {active: boolean}, removable: (boolean|*), styles}}
   */
  getState() {
    return this.state;
  }

  /**
   * @returns {*} layer source (ex. ogr, spatialite, etc..)
   */
  getSource() {
    return this.state.source;
  }

  /**
   * @returns {string|string[]|boolean|string|*} whether is hidden
   */
  isHidden() {
    return this.state.hidden;
  }

  /**
   * Set hidden
   *
   * @param bool
   */
  setHidden(bool = true) {
    this.state.hidden = bool;
  }

  /**
   * @returns {*|string} id
   */
  getId() {
    return this.state.id;
  }

  /**
   * @returns {*} metadata
   */
  getMetadata() {
    return this.state.metadata
  }

  /**
   * @returns {*} title
   */
  getTitle() {
    return this.state.title;
  }

  /**
   * @returns {*} name
   */
  getName() {
    return this.state.name;
  }

  /**
   * Used by the following plugins "geonotes"
   * 
   * @returns {*} origin name
   */
  getOrigName() {
    return this.state.origname;
  }

  /**
   * @returns { string } Server type
   */
  getServerType() {
    return this.state.servertype || "QGIS";
  }

  /**
   * @returns {*} type
   */
  getType() {
    return this.type;
  }


  /**
   * Check if layer is a type passed
   *
   * @param type
   *
   * @returns {boolean}
   */
  isType(type) {
    return type === this.getType();
  }

  /**
   * @returns {boolean} whether it is disabled
   */
  isDisabled() {
    return this.state.disabled;
  }

  /**
   * @returns {boolean} whether is visible
   */
  isVisible() {
    if (this._RASTER_LAYER) {
      return this.layers.filter(l => l.isVisible()).length > 0;
    }
    return this.state.visible;
  }

  /**
   * @returns { boolean } whether layer is queryable
   */
  isQueryable() {
    return !!(this.state?.capabilities & 1);
  }

  /**
   * @TODO Description
   *
   * @returns {boolean}
   */
  getTocHighlightable() {
    return this.state.tochighlightable;
  }

  /**
   * @TODO Description
   *
   * @param bool
   */
  setTocHighlightable(bool = false) {
    this.state.tochighlightable = bool;
  }

  /**
   * @param conditions plain object with configuration layer attribute and value
   * 
   * @returns { boolean } whether layer is filterable
   */
  isFilterable(conditions=null) {
    let isFiltrable = !!(this.state?.capabilities & 2);
    if (isFiltrable && conditions) {
      isFiltrable = Object.keys(conditions).reduce((bool, attribute) => {
        const layer_config_value = this.get(attribute);
        const condition_attribute_values = conditions[attribute];
        return bool && Array.isArray(layer_config_value) ?
          layer_config_value.includes(condition_attribute_values) :
          condition_attribute_values === layer_config_value;
      }, true);
    }
    return isFiltrable;
  }

  /**
   * @returns { boolean } whether layer is set up as time series
   */
  isQtimeseries() {
    return this.state.qtimeseries;
  }

  /**
   * @returns { boolean } whether layer is editable
   */
  isEditable() {
    return !!(this.state?.capabilities & 4);
  }

  /**
   * @returns {*|boolean} whether is a base layer
   */
  isBaseLayer() {
    return this.state.baselayer;
  }

  /**
   * @param type get url by type (data, shp, csv, xls, editing, ...)
   */
  getUrl(type) {
    return this.state.urls[type];
  }

  /**
   * Set config url
   * 
   * @param { Object } url
   * @param url.type
   * @param url.url
   */
  setUrl({ type, url } = {}) {
    this.state.urls[type] = url;
  }

  /**
   * @returns { string }  query url based on type, external or same projection of map
   */
  getQueryUrl() {
    if (this._RASTER_LAYER && 'XYZ' !== this.state.type) {
      if (this.layers[0].infourl && '' !== this.layers[0].infourl) {
        return this.layers[0].infourl;
      }
      return this.state.url;
    }

    let url;
    if (Layer.LayerTypes.IMAGE === this.type) {
      url       = this.state.urls.query;
      const is_qgis = (
        "QGIS" === this.getServerType()
        && this.isExternalWMS()
        && this.state.crs.epsg === this.state.map_crs
      );

      /** @FIXME add description */
      if (is_qgis && this.getInfoFormats()) {
        return this.getSource().url;
      }

      /** @FIXME add description */
      if (is_qgis) {
        return `${url}SOURCE=${this.state.source.type}`;
      }
    }
    return url;
  }

  /**
   * @TODO Description
   *
   * @param ogcService
   *
   * @returns { default.watch.infoformat | * | string }
   */
  getInfoFormat(ogcService) {
    if (this._RASTER_LAYER && 'XYZ' !== this.state.type) {
      return 'application/vnd.ogc.gml';
    }
    // In the case of NETCDF (qtime series)
    if (true === this.state.qtimeseries || 'gdal' === this.getSourceType()) {
      return 'application/json';
    }
    if (this.state.infoformat && '' !== this.state.infoformat  && 'wfs' !== ogcService) {
      return this.state.infoformat;
    }
    return 'application/vnd.ogc.gml';
  }

  /**
   * @TODO Description
   *
   * @returns {(function(): *)|*|*[]}
   */
  getInfoFormats() {
    return this.state.infoformats;
  }

  /**
   * @TODO Description
   *
   * @returns {*}
   */
  getInfoUrl() {
    return this.state.infourl;
  }

  /**
   * @TODO Description
   *
   * @param infoFormat
   */
  setInfoFormat(infoFormat) {
    this.state.infoformat = infoFormat;
  }

  /**
   * @TODO Description
   *
   * @returns {*|{}}
   */
  getAttributes() {
    return this.state.fields;
  }

  /**
   * @TODO Description
   *
   * @param name
   *
   * @returns {*}
   */
  getAttributeLabel(name) {
    return (this.getAttributes().find(a => name === a.name) || {}).label;
  }

  /**
   * Return provider by type
   *
   * @param type
   *
   * @returns {*}
   */
  getProvider(type) {
    return this.providers[type];
  }

  /**
   * @TODO Description
   *
   * @returns {*}
   */
  getLayersStore() {
    return this._layersstore;
  }

  /**
   * @returns { boolean } whether is possible to show attributes table 
   */
  canShowTable() {
    return (
      !this.state.not_show_attributes_table && !this.isBaseLayer() && 
      (
        (this.isQueryable() && this.getTableFields().length > 0 && ["QGIS postgres", "QGIS oracle", "QGIS wfs", "QGIS ogr", "QGIS mssql", "QGIS spatialite"].includes(`${this.getServerType()} ${this.state.source.type}`))
        || ("G3WSUITE geojson" === `${this.getServerType()} ${this.get('source').type}`)
        || (this.isFilterable() && "G3WSUITE" !== this.getServerType())
      )
    );
  }

  /**
   * Used by the following plugins: "law"
   */
  changeConfigFieldType({ name, type, options = {}, reset = false, }) {
    const field = this.getFields().find(f => name === f.name);
    if (field && reset) {
      field.type = field._type;
      delete field._type;
      delete field[`${type}options`];
      return field.type;
    }

    if (field && !reset) {
      field._type             = field.type;
      field.type              = type;
      field[`${type}options`] = options;
      return field._type;
    }
  }

  /**
   * Function called in case of change project to remove all stored information 
   */
  clear() {}

  /**
   * @returns {boolean} whether is a vector layer
   */
  isVector() {
    return Layer.LayerTypes.VECTOR === this.getType();
  }

  /**
   * @returns {boolean} whether is a table layer
   */
  isTable() {
    return Layer.LayerTypes.TABLE === this.getType();
  }

  /**
   * @since 3.8.0
   */
  getFeatureCount() {
    return this.state.featurecount;
  }

  /**
   * @param style
   * 
   * @returns { Promise<Object | void>}
   * 
   * Change featurecount and editor form structure for a specific style
   * 
   * @since 4.0.0
   */
  async changeCurrentStyle(style) {
    try {
      // skip if style is currently set on layer
      if ((this.state.styles.find(s => style === s.name) || {}).current) {
        return;
      }

      // get feature count (skipped when layer hasn't feature count option set on QGIS project)
      if (undefined !== this.state.stylesfeaturecount && undefined === this.state.stylesfeaturecount[style]) {
          const { result, data } = await XHR.post({
            url:          `${this.state.urls.featurecount}${this.getId()}/`,
            data:         JSON.stringify({ style }),
            contentType: 'application/json'
          });
          this.state.stylesfeaturecount[style] = (true === result ? data : {});
      }

      // set current feature count
      if (undefined !== this.state.stylesfeaturecount) {
        this.state.featurecount = this.state.stylesfeaturecount[style];
      }

      // get editor form structure
      const { result, data = {} } = await XHR.post({
        url:          `${this.state.urls.editorformstructure}${this.getId()}/`,
        data:         JSON.stringify({ style }),
        contentType: 'application/json'
      });

      // set form structure
      if (result) {
        this.state.editor_form_structure = data?.editor_form_structure;
        this.state.scalebasedvisibility   = data?.scalebasedvisibility;
        this.state.minscale               = data?.minscale;
        this.state.maxscale               = data?.maxscale;
      }

      // set as current style
      this.state.styles.forEach(s => s.current = style === s.name);

      this.change();
    } catch(e) {
      console.warn(e);
      this.state.stylesfeaturecount[style] = {};
    }
  }

  /**
   * @returns { string } layer format (eg. 'image/png') 
   * 
   * @since 3.9.1
   */
  getFormat() {
    if (Layer.LayerTypes.IMAGE === this.type && this.isExternalWMS() && this.getSource()) {
      return this.getSource().format;
    }
    return this.state.format
      || ApplicationState.project.state.wms_getmap_format
      || 'image/png'
  }

  /**
   * @since 3.10.0
   */
  openAttributeTable(opts = {}) {
    new (Vue.extend(Table))({ ...opts, layerId: this.state.id });
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   * 
   * Set layer categories legend
   * 
   * @param { Array } categories
   * 
   * @since 4.0.0
   */
  setCategories(categories = []) {
    this.state.legend.categories[this.getCurrentStyle().name] = categories;
    //set categories state attribute to true only if exist at least a rule key
    this.state.categories = (categories || []).filter(category => category.ruleKey).length > 0;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   * 
   * @returns legend categories of layer
   * 
   * @param { Array } categories
   * 
   * @since 4.0.0
   */
  getCategories() {
    return this.state.legend.categories[this.getCurrentStyle().name];
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * Clear all categories
   *
   * @since 4.0.0
   */
  clearCategories() {
    this.state.legend.categories = {};
    this.state.categories = false;
  }

  /**
   * [LAYER SELECTION] ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   * 
   * Get OpenLayer selection feature by feature id
   * 
   * @param id
   * 
   * @since 4.0.0
   */
  getOlSelectionFeature(id) {
    return this.state.ol_selection[id];
  }

  /**
   * [LAYER SELECTION] ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  addOlSelectionFeature({ id, feature: feat } = {}) {
    //create a new ol feature
    const feature = new ol.Feature(feat.geometry);
    feature.setId(`${this.getId()}_${id}`); // see: #777, prevent ID collision when selecting features from multiple layers
    Object.entries(feat.attributes).forEach(([a, v]) => feature.set(a, v));
    this.state.ol_selection[id] = this.state.ol_selection[id] || {
      feature,
      added:    false,
      selected: false, /** @since 3.9.9 */
    };
    return this.state.ol_selection[id];
  }

  /**
   * [LAYER SELECTION] ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * Show all selection features
   *
   * @since 4.0.0
   */
  #updateOlSelection() {
    const map = GUI.getService('map');
    // Loop `added` features (selected)
    Object
      .values(this.state.ol_selection)
      .forEach(f => {
        if (f.selected !== f.added) {
          map.setSelectionFeatures(f.selected ? 'add' : 'remove', { feature: f.feature });
          f.added = f.selected;
        }
      });
    // Ensures selection layer is always visible on map
    map.toggleSelection(
      !this.state.filter.active && Object.values(this.state.ol_selection).some(f => f.selected),
      this.state.id
    );
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * Set layer legend item `checked` state (TOC)
   *
   * @param { boolean } bool
   *
   * @since 4.0.0
   */
  setChecked(bool) {
    this.state.checked = bool;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @returns { boolean } whether layer legend item is checked (TOC)
   *
   * @since 4.0.0
   */
  isChecked() {
    return this.state.checked;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @param { Boolean } bool
   * 
   * @returns {*} whether visiblitity is disabled (based on scalevisibility) and checked on toc
   *
   * @since 4.0.0
   */
  setVisible(bool) {
    if (this.getMapLayer()) {
      this.getMapLayer().setVisible(bool)
    }
    
    if (!this.state) {
      return bool;
    }
    const visible  = this.state.visible;
    this.state.visible = bool && this.isChecked();
    // emit 'change' event
    if (visible !== this.state.visible) {
      this.change?.();
    }
    return this.state.visible;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  isPrintable({ scale } = {}) {
    // find out if layer and all parents are checked
    let checked = this.isChecked();
    if (checked) {
      let parentGroup = this.state.parentGroup;
      //loop from bottom to top
      while(checked && parentGroup) {
        checked     = checked && parentGroup.checked;
        parentGroup = parentGroup.parentGroup;
      }
    }
    return checked
      && (
        !this.state.scalebasedvisibility
        || (scale >= this.state.maxscale && scale <= this.state.minscale)
      );
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   * 
   * @returns style for layer
   *
   * @since 4.0.0
   */
  getStyles() {
    return this.state.source.external ? this.state.source.styles : this.state.styles;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getStyle() {
    return this.state.source.external ? this.state.source.styles : this.state.styles ? this.state.styles.find(s => s.current).name : '';
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   * 
   * @returns { number } transparency property
   *
   * @since 4.0.0
   */
  getOpacity() {
    return this.state.opacity;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getCurrentStyle() {
    return this.state.styles.find(s => s.current);
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * Disable layer by check scalevisibility configuration value
   *
   * @param resolution
   * @param mapUnits
   *
   * @since 4.0.0
   */
  setDisabled(resolution, mapUnits = 'm') {
    if ('boolean' === typeof resolution) {
      return this.state.disabled = resolution;
    }
    if (this.state.scalebasedvisibility) {
      const mapScale      = getScaleFromResolution(resolution, mapUnits);
      this.state.disabled = !(mapScale >= this.state.maxscale && mapScale <= this.state.minscale);
      this.state.disabled = this.state.minscale === 0 ? !(mapScale >= this.state.maxscale) : this.state.disabled;
      // needed to check if call setVisible is change disable property
      // looping through parentfolter checked
      let setVisible = true;
      let parentGroup = this.state.parentGroup;
      while (parentGroup) {
        setVisible  = setVisible && parentGroup.checked;
        parentGroup = parentGroup.parentGroup;
      }
      if (setVisible) {
        this.setVisible(!this.state.disabled);
      }
      // change toc highlight property based on disabled otr not
      if (this.isFilterable()) {
        this.setTocHighlightable(!this.state.disabled);
      }
    } else {
      this.state.disabled = false;
    }
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getMultiLayerId() {
    return this.state.multilayerid;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getGeometryType() {
    return this.state.geometrytype;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   * ORIGINAL SOURCE: src/map/layers/imagelayer.js@v4.0.0
   *
   * @see https://github.com/g3w-suite/g3w-client/issues/616
   * 
   * forces to `GET` when wms layer is external or query url isn't a qgis server endpoint (ie. doesn't start with `/ows/`).
   * 
   * @since 4.0.0
   */
  getOwsMethod() {
    if (Layer.LayerTypes.IMAGE === this.type) {
      return this.isExternalWMS() || !/^\/ows/.test((new URL(this.getQueryUrl(), window.initConfig.baseurl)).pathname)
        ? 'GET'
        : this.state.ows_method;
    }
    return this.state.ows_method;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  setProjection(crs = {}) {
    this.state.projection = ApplicationState.projections.get(crs);
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getProjection() {
    return this.state.projection;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getEpsg() {
    return this.state.crs.epsg;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getCrs() {
    if (Layer.LayerTypes.IMAGE === this.type) {
      return this.state.crs.epsg;
    }
    return this.state.projection ? this.state.projection.getCode() : null;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  isCached() {
    return this.state.cache_url && '' !== this.state.cache_url;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getCacheUrl() {
    // mapproxy provider → cache_url already contains "{z}/{x}/{-y}.png"
    if (this.isCached() && this.state.cache_provider && 'mapproxy' === this.state.cache_provider) {
      return this.state.cache_url;
    }
    if (this.isCached()) {
      return `${this.state.cache_url}/{z}/{x}/{y}.png`;
    }
  }

  /**
   * @returns { string } wms layer name for wms request
   */
  getWMSLayerName({ type = 'map' } = {}) {
    if (Layer.LayerTypes.IMAGE === this.type) {
      const source_layer = this.state?.source?.layers || this.state?.source?.layer;

      /** @FIXME add description */
      if (source_layer && this._hasExternalWMSOrLegend(type)) {
        return source_layer;
      }

      return this.state.wms_use_layer_ids ? this.getId() : this.getName();
    }
    return this.state.wms_use_layer_ids ? this.getId() : this.getName()
  }

  /**
   * @since 4.1.0
   */
  getColor() {
    return this._color;
  }

  /**
   * @since 4.1.0
   */
  setColor(color) {
    this._color = color;
  }

  /**
   * @since 4.1.0 
   */
  addFeature(feature)    { this._featuresstore.addFeature(feature); }

  /**
   * @TODO check if it unusued
   * 
   * @since 4.1.0
   */
  updateFeature(feature) { this._featuresstore.updateFeature(feature);}

  /**
   * @TODO check if it unusued
   * 
   * @since 4.1.0
   */
  setFeatures(features)  { this._featuresstore.setFeatures(features); }

  /**
   * get data from every sources (server, wms, etc..)
   * through provider related to featuresstore
   *
   * @param {*} opts
   * 
   * @since 4.1.0
   */
  async getFeatures(opts = {}) {
    const features = await this._featuresstore.getFeatures(opts);
    this.emit('getFeatures', features);
    return features;
  }

  /**
   * @since 4.1.0 
   */
  async commit(commitItems) {
    const response = await this._featuresstore.commit(commitItems);
    // sync selection filter features
    if (response && response.result) {
      try {
        const layer = getCatalogLayerById(this.getId());
        //if layer has geometry
        if (layer.isGeoLayer()) {
          commitItems.update.forEach(({ id, geometry } = {}) => {
            if (layer.getOlSelectionFeature(id)) {
              const selected = layer.getOlSelectionFeature(id);
              if (selected) {
                selected.feature = geometry;
                GUI.getService('map').setSelectionFeatures('update', { feature: geometry });
              }
            }
          });
        }
        commitItems.delete.forEach(id => {
          if (layer.hasSelectionFid(id)) {
            layer.excludeSelectionFid(id);
          }
        })
      } catch(e) {
        console.warn(e);
      }
    }
    return response;
  }

  /**
   * @since 4.1.0
   */
  clone() {
    return cloneDeep(this);
  }

  /**
   * @since 4.1.0
   */
  readFeatures() {
    return this._featuresstore.readFeatures();
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * Unlock editing features
   *
   * @returns jQuery Promise
   * 
   * @since 4.1.0
   */
  async unlock() {
    return await this._featuresstore.unlock();
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * 
   * @since 4.1.0
   */
  getEditor() {
    return this._editor;
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * 
   * @since 4.1.0
   */
  isStarted() {
    return this._editor?.isStarted()
  }

  /**
   * @since 4.1.0
   */
  getFeaturesStore() {
    return this._featuresstore;
  }

  /**
   * @since 4.1.0
   */
  setSource(source) {
    this._featuresstore = source;
  }

  /**
   * @since 4.1.0
   */
  addFeatures(features = []) {
    features.forEach(f => this.addFeature(f));
  }

  /**
   * @since 4.1.0
   */
  resetEditingSource(features = []) {
    this.getMapLayer().resetSource(features)
  }

  /**
   * @since 4.1.0
   */
  change() {}

  /**
   * @since 4.1.0
   */
  isWMS() {
    return Layer.LayerTypes.IMAGE === this.type && ["QGIS", "Mapserver", "Geoserver", "OGC"].includes(this.state.servertype);
  }

  /**
   * @since 4.1.0
   */
  isExternalWMS() {
    return Layer.LayerTypes.IMAGE === this.type && !!(this.state.source && this.state.source.external && this.state.source.url);
  }

  /**
   * @since 4.1.0
   */
  isArcgisMapserver() {
    return Layer.LayerTypes.IMAGE === this.type && this.isExternalWMS() && "arcgismapserver" === this.state.source.type;
  }

  /**
   * @since 4.1.0
   */
  _hasExternalWMSOrLegend(type = 'map') {
    return (
        Layer.LayerTypes.IMAGE === this.type &&
        this.state.source && (
        ('map' !== type || (this.isExternalWMS() && this.state.crs.epsg === this.state.map_crs)) &&
        ('legend' !== type || this.state.source.external)
      )
    );
  }

  /**
   * @param opts
   * @param { 'map' | 'legend' } opts.type 
   * 
   * @since 4.1.0
   */
  getWmsUrl({ type = 'map' } = {}) {
    if (Layer.LayerTypes.IMAGE !== this.type) {
      return;
    }

    /** @FIXME add description */
    if (this.state?.source?.url && this._hasExternalWMSOrLegend(type) && ['wms', 'wmst'].includes(this.state?.source?.type)) {
      return this.state.source.url;
    }

    return this.state.wmsUrl;
  }

  /**
   * @since 4.1.0
   */
  getWFSLayerName() {
    return Layer.LayerTypes.IMAGE === this.type && (this.state.infolayer || this.getName()).replace(/\s/g, '_').replaceAll( ':', '-' );
  }

  /**
   * @since 4.1.0
   */
  useProxy() {
    return this.isExternalWMS() && this.state.crs.epsg === this.state.map_crs && this.getInfoFormats();
  }

  /**
   * @since 4.1.0
   */
  getWMSInfoLayerName() {
    if (Layer.LayerTypes.IMAGE !== this.type) {
      return;
    }
    if (this.useProxy()) {
      return this.getSource().layers;
    }
    if (this.state.wms_use_layer_ids) {
      return this.getId();
    }
    return this.getName();
  }

  /**
   * @since 4.1.0
   */
  getPrintLayerName() {
    if (Layer.LayerTypes.IMAGE !== this.type) {
      return;
    }
    if (this.state.wms_use_layer_ids) {
      return this.getId();
    }
    return this.getName();
  }

  /**
   * @since 4.1.0
   */
  isWfsActive() {
    return Layer.LayerTypes.IMAGE === this.type && Array.isArray(this.state.ows) && this.state.ows.some(t => 'WFS' === t);
  }

  /**
   * @since 4.1.0
   */
  getWfsUrl() {
    return Layer.LayerTypes.IMAGE === this.type && (ApplicationState.project.state.metadata.wms_url || this.state.wmsUrl);
  }

  /**
   * Retrieve legend url (ARCGISMAPSERVER or WMS)
   * 
   * ORIGINAL SOURCE: src/app/core/layers/legend/legendservice.js@3.8.5
   * 
   * @param { boolean }                                    opts.categories whether layer has categories
   * @param { boolean }                                    opts.all        whether to show all categories (disables filter by map's BBOX).
   * @param { 'application/json' | 'image/png' | string }  opts.format     MIME Type used to set format of legend:
   *                                                                          - `application/json`: if request from layers categories (icon and label),
   *                                                                          - `image/png`: if request from legend tab
   * 
   * @see https://docs.qgis.org/3.28/en/docs/server_manual/services/wms.html#getlegendgraphics
   * 
   * @since 4.1.0
   */
  getLegendUrl(params = {}, opts = { categories:false,  all:false,format:'image/png',}) {
    if (Layer.LayerTypes.IMAGE !== this.type) {
      return;
    }

    let base_url, url_params;

    let {
      width,
      height,
      color       = "white",
      fontsize    = 10,
      transparent = true,
      boxspace,
      layerspace,
      layertitle  = true,
      layertitlespace,
      symbolspace,
      iconlabelspace,
      symbolwidth,
      symbolheight,
      itemfontfamily,
      layerfontfamily,
      layerfontbold,
      itemfontbold,
      itemfontsize,     //@since 3.11.3
      layerfontitalic,
      layerfontsize,    //@since 3.11.3
      showfeaturecount, //@since 3.11.3
      itemfontitalic,
      rulelabel,
      crs,
      bbox,
      sld_version = '1.1.0',
    } = {
      ...params,
      ...this.customParams
    };

    /**
     * ARCGIS Server
     * 
     * ORIGINAL SOURCE: src/app/core/layers/legend/arcgismapserverlegend.js@3.8.5
     */
    if (this.isArcgisMapserver()) {
      base_url   = this.getConfig().source.url.replace('/rest/', '/') + '/WMSServer';
      url_params = [
        'request=GetLegendGraphic',
        'version=1.3.0',
        'format=image/png',
        `LAYER=${this.getConfig().source.layer}`,
      ];
    }

    /**
     * WMS Server
     * 
     * ORIGINAL SOURCE: src/app/core/layers/legend/wmslegend.js@3.8.5
     */
    else {
      const ctx_legend = (
        opts.categories && (['image/png', undefined].includes(opts.format) || ApplicationState.project.state.context_base_legend)
          ? get_legend_params(this)
          : undefined // disabled when `FORMAT=application/json` (otherwise it creates some strange behaviour on WMS `getMap` when switching between layer styles)
      );
      base_url   = this.getWmsUrl({ type: 'legend' });
      url_params = [
        'SERVICE=WMS',
        'VERSION=1.3.0',
        'REQUEST=GetLegendGraphic',
        __('SLD_VERSION=',      sld_version),
        __('WIDTH=',            width),
        __('HEIGHT=',           height),
        __('FORMAT=',           (undefined === opts.format ? 'image/png' : opts.format)),
        __('TRANSPARENT=',      transparent),
        __('ITEMFONTCOLOR=',    color),
        __('LAYERFONTCOLOR=',   color),
        __('LAYERTITLE=',       layertitle),
        __('ITEMFONTSIZE=',     itemfontsize || fontsize), //@since 3.11.3 check itemfontsize or fontsize
        __('CRS=',              crs),
        __('BBOX=',             ((true === opts.all ? undefined : [false, undefined].includes(opts.all) && bbox && bbox.join(',')))),
        __('BOXSPACE=',         boxspace),
        __('LAYERSPACE=',       layerspace),
        __('LAYERTITLESPACE=',  layertitlespace),
        __('SYMBOLSPACE=',      symbolspace),
        __('ICONLABELSPACE=',   iconlabelspace),
        __('SYMBOLWIDTH=',      (opts.categories && 'application/json' === opts.format ? 16 : symbolwidth)),
        __('SYMBOLHEIGHT=',     (opts.categories && 'application/json' === opts.format ? 16 : symbolheight)),
        __('LAYERFONTFAMILY=',  layerfontfamily),
        __('ITEMFONTFAMILY=',   itemfontfamily),
        __('LAYERFONTBOLD=',    layerfontbold),
        __('ITEMFONTBOLD=',     itemfontbold),
        __('LAYERFONTITALIC=',  layerfontitalic),
        __('LAYERFONTSIZE=',    layerfontsize),    //@since 3.11.3
        __('SHOWFEATURECOUNT=', showfeaturecount), //@since 3.11.3
        __('ITEMFONTITALIC=',   itemfontitalic),
        __('RULELABEL=',        rulelabel),
        __('LEGEND_ON=',        ctx_legend && ctx_legend.LEGEND_ON),
        __('LEGEND_OFF=',       ctx_legend && ctx_legend.LEGEND_OFF),
        __('STYLES=',           (opts.categories && 'application/json' === opts.format ? encodeURIComponent(this.getCurrentStyle().name) : undefined)),
        __('LAYER=',            this.getWMSLayerName({ type: 'legend' }))
      ]; 
    }

    return `${base_url}${(base_url.indexOf('?') > -1 ? '&' : '?')}${url_params.filter(p => p).join('&')}`;
  }

  /**
   * Update Layers
   * 
   * ORIGINAL SOURCE: src/app/core/layers/baselayer.js@v3.10.0
   * ORIGINAL SOURCE: src/app/core/layers/imagelayer.js@v4.0.0
   * 
   * @since 4.1.0
   */
  update(mapState = {}, extraParams = {}) {
    if (this._RASTER_LAYER && this._olLayer) {
      let { force, ...params } = extraParams;

      // check which layers have to be disabled
      const { resolution, mapUnits } = mapState;
      this.allLayers.forEach(l => { l.setDisabled(resolution, mapUnits); return l.isDisabled(); });
      
      if ('XYZ' === this.state.type) {
        this._olLayer.setVisible(this.layer.isVisible());
        return;
      }
      
      const layers = this.layers.filter(l => l.isVisible()) || [];

      // skip when ..
      if (layers.length <= 0) {
        this._olLayer.setVisible(false);
        return;
      }

      const STYLES     = [];
      const OPACITIES  = [];
      let LEGEND_ON    = undefined;
      let LEGEND_OFF   = undefined;

      layers.forEach(l => {
        const { LEGEND_ON: on, LEGEND_OFF: off } = get_legend_params(l);
        STYLES.push(l.getStyle());
        OPACITIES.push(parseInt((l.getOpacity() / 100) * 255));
        if (on)  { LEGEND_ON  = undefined === LEGEND_ON  ? on  : `${LEGEND_ON};${on}` }
        if (off) { LEGEND_OFF = undefined === LEGEND_OFF ? off : `${LEGEND_OFF};${off}` }
      })

      this._olLayer.setVisible(true);
      this._olLayer.getSource()?.updateParams?.({
        ...params,
        LEGEND_ON,
        LEGEND_OFF,
        filtertoken: ApplicationState.tokens.filtertoken,
        LAYERS:      `${layers[0].isArcgisMapserver() ? 'show:' : ''}${layers.map(l => l.getWMSLayerName()).join(',')}`,
        STYLES:      STYLES.join(','),
        /** @since 3.8 */
        OPACITIES:   OPACITIES.join(','),
      });
      return;
    }
    
    if (Layer.LayerTypes.IMAGE === this.type && this.isWMS()) {
      this._mapLayer.update(mapState, extraParams)
    }
  }

  /**
   * ORIGINAL SOURCE: src/app/core/layers/baselayer.js@v3.10.0
   * 
   * @since 4.1.0
   */
  getProjectionFromCrs(crs = {}) {
    if (Layer.LayerTypes.IMAGE === this.type) {
      crs.epsg = crs.epsg ? crs.epsg : 'EPSG:3857';
      return ApplicationState.projections.get(crs);
    }
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/vectorlayer.js@v4.0.0
   * ORIGINAL SOURCE: src/map/layers/imagelayer.js@v4.0.0
   *
   * @since 4.1.0
   */
  getMapLayer(options = {}, extraParams) {

    if (this._mapLayer) {
      return this._mapLayer;
    }

    let mapLayer;

    options.iframe_internal  = Layer.LayerTypes.IMAGE === this.type ? ApplicationState.iframe && !this.isExternalWMS() : options.iframe_internal;

    // TMS Layer
    if (Layer.LayerTypes.IMAGE === this.type && this.isCached() && 'tms' === (this.state.cache_service_type || 'tms')) {
      mapLayer = new Layer(
        {
          ...options,
          extent:         (this.state.bbox ? [this.state.bbox.minx, this.state.bbox.miny, this.state.bbox.maxx, this.state.bbox.maxy] : null),
          url:            this.getCacheUrl(),
          cache_provider: this.state.cache_provider,
          type:           'XYZ'
        },
        { _RASTER_LAYER: { params: {}, method: this.isExternalWMS() ? 'GET' : this.getOwsMethod() } }
      );
    }

    // ARCGIS Layer
    if (Layer.LayerTypes.IMAGE === this.type && this.isExternalWMS() && "arcgismapserver" === this.state?.source?.type) {
      mapLayer = new Layer(
        { ...options, ...this.state.source },
        { _RASTER_LAYER: { params: extraParams } }
      );
    }

    // WMTS Layer
    if (Layer.LayerTypes.IMAGE === this.type && this.isCached() && 'wmts' === this.state.cache_service_type) {
      mapLayer = new Layer({
          ...options,
          url:               this.getCacheUrl(),
          cache_provider:    this.state.cache_provider,
          cache_layer:       this.state.cache_layer,
          cache_extent:      this.state.cache_extent,
          cache_grid:        this.state.cache_grid,
          cache_grid_extent: this.state.cache_grid_extent,
          type: 'WMTS',
        },
        { _RASTER_LAYER: { params: extraParams, method: this.isExternalWMS() ? 'GET' : this.getOwsMethod() } }
      );
    }

    // WMST Layer
    if (Layer.LayerTypes.IMAGE === this.type && this.isExternalWMS() && "wmst" === this.state?.source?.type) {
      mapLayer = new Layer(
        {
          ...options,
          url: this.isCached() ? this.getCacheUrl() : (options.url || this.getWmsUrl()),
          cache_provider: this.state.cache_provider,
          type: 'WMTS'
        },
        { _RASTER_LAYER: { params: extraParams, method: 'GET' } }
      );
    }

    // WMS Layer
    if (this.isWMS()) {
       mapLayer = new Layer(
        { ...options, url: this.isCached() ? this.getCacheUrl() : (options.url || this.getWmsUrl()) },
        { _RASTER_LAYER: { params: extraParams, method: this.isExternalWMS() ? 'GET' : this.getOwsMethod() } }
      );
    }

    // Vector Layer
    if (Layer.LayerTypes.VECTOR === this.type) {
      const style = 'G3WSUITE geojson' === `${this.state.servertype} ${this.state.source?.type}` ? this.get('style') : (this.state?.editing?.style ?? this.getCustomStyle());

      mapLayer = Object.assign(new G3WObject, {
        _olLayer:      Object.assign(new ol.layer.Vector({
          id:             this.getId(),
          __g3w_editable: this.isEditable(), //@since 3.11.0 is a attribute to specify if layer OL is editable or not for G3W-SUITE
          source:         new ol.source.Vector({ features: (this?.getEditor?.()?.getEditingSource?.().getFeaturesCollection?.() || []) || new ol.Collection() }),
          style:          new ol.style.Style(
            (style && Object.entries(style || {}).reduce((styles, [type, config]) => Object.assign(styles, {
              image:  'point'   === type && config.icon ? new ol.style.Icon({ src: config.icon.url, imageSize: config.icon.width }) : undefined,
              stroke: 'line'    === type                ? new ol.style.Stroke({ color: config.color, width: config.width })         : undefined,
              fill:   'polygon' === type                ? new ol.style.Fill({ color: config.color })                                : undefined,
            }), {}))
            || (isPointGeometryType(this.getGeometryType())   && { image: new ol.style.Circle({ fill: new ol.style.Fill({ color: this.getColor() }), radius: 5, })})
            || (isLineGeometryType(this.getGeometryType())    && { stroke: new ol.style.Stroke({ color: this.getColor(), width: 3 }) })
            || (isPolygonGeometryType(this.getGeometryType()) && { stroke: new ol.style.Stroke({ color: '#000', width: 1 }), fill: new ol.style.Fill({ color: this.getColor() }) })
          ),
        }), {
          /** @since 3.11.0 to have same compatibility with table layer */
          getEditingSource: () => this?.getEditor?.()?.getEditingSource?.(),
        }),
        mapService:    GUI.getService('map'),
        geometryType:  this.getGeometryType(),
        geometrytype:  null,
        type:          null,
        crs:           null,
        id:            this.getId(),
        name:          'G3WSUITE geojson' === `${this.state.servertype} ${this.state.source?.type}` && this.getName() || '',
        style,
        color:         this.getColor(),
        projection:    'G3WSUITE geojson' === `${this.state.servertype} ${this.state.source?.type}` ? this.getProjection().getCode() : GUI.getService('map').getProjection().getCode(),
        url:           'G3WSUITE geojson' === `${this.state.servertype} ${this.state.source?.type}` ? this.get('source').url : undefined,
        provider:      this.getProvider('data'),
        getProvider:   ()           => this._mapLayer.provider,
        resetSource:   (feats = []) => this._mapLayer.setSource(new ol.source.Vector({ features: feats })),
        getFeatures:   async (opts = {})  => this._mapLayer.addFeatures(await this._mapLayer.provider.getFeatures(opts)),
        addFeatures:   (feats = []) => this._mapLayer.getSource().addFeatures(feats),
        addFeature:    feat         => feat && this.getSource().addFeature(feat),
        getOLLayer:    ()           => this._mapLayer._olLayer,
        getSource:     ()           => this._mapLayer._olLayer.getSource(),
        setSource:     source       => this._mapLayer._olLayer.setSource(source),
        setStyle:       style       => this._mapLayer._olLayer.setStyle(style),
        getFeatureById:    id       => id ? this._mapLayer._olLayer.getSource().getFeatureById(id) : null,
        isVisible:         ()       => this._mapLayer._olLayer.getVisible(),
        setVisible:      bool       => this._mapLayer._olLayer.setVisible(bool),
        clear:             ()       => this._mapLayer.getSource().clear(),
        addToMap:         map       => map.addLayer(this._mapLayer._olLayer),
      });

      if (!style && isPolygonGeometryType(this.getGeometryType())) {
        mapLayer._olLayer.setOpacity(0.6);
      }

      if ('G3WSUITE geojson' === `${this.state.servertype} ${this.state.source?.type}`) {
        this.getProvider('data').getFeatures({
          url:           this.get('source').url,
          mapProjection: GUI.getService('map').getProjection().getCode()
        }).then(feats => this._mapLayer._olLayer.getSource().addFeatures(feats));
      }
    }

    return (this._mapLayer = mapLayer);
  }

  /**
   * ORIGINAL SOURCE: src/app/core/layers/baselayer.js@v3.10.0
   * 
   * @param {boolean} withLayers
   * 
   * @listens ol.source.ImageWMS~imageloadstart
   * @listens ol.source.ImageWMS~imageloadend
   * @listens ol.source.ImageWMS~imageloaderror
   * 
   * @since 4.1.0
   */
  getOLLayer(withLayers) {
    if (this._olLayer) {
      return this._olLayer;
    }

    let olLayer;

    /** @type { 'image' | 'tile' } */
    let image = 'image';

    /**
     * ORIGINAL SOURCE: src/app/core/layers/layerfactory.js@v3.10.2
     */
    if ('OSM' === this._BASE_LAYER) {
      olLayer = new ol.layer.Tile({
        source:  new ol.source.OSM({ url: this.state.url }),
        id:      this.state.name  || 'osm',
        title:   this.state.title || 'OSM',
        basemap: true
      });
    }

    /**
     * ORIGINAL SOURCE: src/app/core/layers/layerfactory.js@v3.10.2
     */
    if ('Bing' === this._BASE_LAYER) {
      const name = ({
        streets:          'Road',
        aerial:           'Aerial',
        aerialwithlabels: 'AerialWithLabels'
      })[this.state?.source?.subtype] || 'Aerial';
      olLayer = new ol.layer.Tile({
        source: new ol.source.BingMaps({ imagerySet: name, key: ApplicationState.keys.vendorkeys.bing }),
        name,
        visible: false,
        preload: Infinity,
        basemap: true,
      });
    }

    /**
     * ORIGINAL SOURCE: src/app/core/layers/layerfactory.js@v3.10.2
     */
    if ('TMS' === this._BASE_LAYER && (undefined !== this.state.url ? this.state.url : null)) {
      const projection = this.getProjectionFromCrs(this.state.crs);
      olLayer = new ol.layer.Tile({
        visible:    false,
        projection,
        source:     new ol.source.XYZ({
          url:         undefined !== this.state.url ? this.state.url : null,
          maxZoom:     this.state.maxZoom,
          minZoom:     this.state.minZoom,
          projection,
          crossOrigin: 'anonymous',
          tileGrid:    'degrees' === projection.getUnits() ? new ol.tilegrid.TileGrid({
            // Need to remove the first resolution because in this version of ol createXYZ doesn't accept maxResolution options.
            // The extent of EPSG:4326 is not squared [-180, -90, 180, 90] as EPSG:3857 so the resolution is calculated
            // by Math.max(width(extent)/tileSize,Height(extent)/tileSize)
            // we need to calculate to Math.min instead, so we have to remove the first resolution
            resolutions: ol.tilegrid.createXYZ({ extent: projection.getExtent(), maxZoom: this.state.maxZoom }).getResolutions().slice(1),
            extent:      projection.getExtent(),
          }) : undefined,
        })
      });
    }

    /**
     * ORIGINAL SOURCE: src/app/core/layers/layerfactory.js@v3.10.2
     * 
     * @since 3.10.0
     */
    if ('WMTS' === this._BASE_LAYER && this.state.matrixSet) {
      let projection = this.state.projection || this.getProjectionFromCrs(this.state.crs);
      const size = ol.extent.getWidth(projection.getExtent()) / 256;
      olLayer = new ol.layer.Tile({
        opacity: .7,
        source: new ol.source.WMTS({
          url:             this.state.url,
          projection,
          layer:           this.state.layer,
          matrixSet:       this.state.matrixSet,
          requestEncoding: this.state.requestEncoding,
          format:          this.state.format ?? 'image/png',
          attributions:    this.state.attributions,
          tileGrid: new ol.tilegrid.WMTS({
            origin:      ol.extent.getTopLeft(projection.getExtent()),
            resolutions: Array.from({ length: 14 }, (_, z) => size / Math.pow(2, z)),
            matrixIds:   Array.from({ length: 14 }, (_, z) => z),
          }),
          style: (this.state.style ?? 'default')
        })
      });
    }

    /**
     * ORIGINAL SOURCE: src/app/core/layers/layerfactory.js@v3.10.2
     * 
     * @since 3.10.0 WMTS based on mapproxy
     */
    if ('WMTS' === this._BASE_LAYER && !this.state.matrixSet && this.state.grid && this.state.grid_extent) {
      const resolutions = ol.tilegrid.createXYZ({ extent: this.state.grid_extent }).getResolutions();
      olLayer = new ol.layer.Tile({
        source: new ol.source.WMTS({
          url:         this.state.url,
          layer:       this.state.layer,
          projection,
          matrixSet:   this.state.grid,
          format:      (this.state.format ?? 'image/png') || 'png',
          tileGrid:    new ol.tilegrid.WMTS({ origin: ol.extent.getTopLeft(this.state.grid_extent), resolutions, matrixIds: resolutions.map((_, z) => z), }),
          style:       (this.state.style ?? 'default'),
          transparent: false,
        })
      });
    }

    /**
     * ORIGINAL SOURCE: src/app/core/layers/layerfactory.js@v3.10.2
     */
    if ('ARCGISMAPSERVER' === this._BASE_LAYER) {
      olLayer = new ol.layer.Tile({
        extent:  this.state.extent,
        visible: this.state.visible ?? true,
        source : new ol.source.TileArcGISRest({
          url:          this.state.url,
          projection:   this.state.projection,
          attributions: this.state.attributions,
          crossOrigin:  this.state.crossOrigin,
        })
      });
    }

    // ARCGIS LAYER
    if (this._RASTER_LAYER && 'ARCGISMAPSERVER' === this.state.type) {
      olLayer = new ol.layer.Tile({
        visible: true,
        source:  new ol.source.TileArcGISRest({
          url:          this.state.url,
          projection:   this.state.projection,
        }),
      });
    }

    /** @since 3.10.0 - MapProxy WMTS layer **/
    const resolutions = 'mapproxy' === this.state.cache_provider && ol.tilegrid.createXYZ({ extent: this.state.cache_grid_extent }).getResolutions();

    // WMTS LAYER
    if (this._RASTER_LAYER && 'WMTS' === this.state.type && resolutions) {
      image = 'tile';
      olLayer = new ol.layer.Tile({
        source: new ol.source.WMTS({
          url:         ('mapproxy' === this.state.cache_provider) || !(this.layers[0] && this.layers[0].getWmsUrl) ? this.state.url : this.layers[0].getWmsUrl(),
          layer:       this.state.cache_layer,
          matrixSet:   this.state.cache_grid,
          format:      'png',
          projection:  (withLayers ? this.layers.map(l => l.getWMSLayerName()) : this.layers)[0].getProjection(),
          tileGrid:    new ol.tilegrid.WMTS({
                        resolutions,
                        origin:    ol.extent.getTopLeft(this.state.cache_grid_extent),
                        matrixIds: resolutions.map((_, i) => i),
                      }),
          style:       '',
          transparent: false,
        })
      });
    }

    // XYZ LAYER
    if (this._RASTER_LAYER && 'XYZ' === this.state.type) {
      const projection = this.state.url && this.projection ? this.projection : this.layer.getProjection();
      olLayer = new ol.layer.Tile({
        visible:    true,
        projection,
        source:     new ol.source.XYZ({
          url:              this.state.url,
          maxZoom:          20,
          minZoom:          undefined,
          projection,
          crossOrigin:      undefined,
          tileLoadFunction: (this.iframe_internal) ? (tile, url) => {
            fetch('POST' === this._method ? (url || '').split('?')[0] : url, {
              method:  this._method,
              headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
              body:    'POST' === this._method ? url.split('?')[1] : undefined,
            })
            .then(async response => tile.getImage().src = URL.createObjectURL(await response.blob()))
            .catch(e => { console.error('Invalid tile', ol.TileState.ERROR, e); tile.setState(ol.TileState.ERROR); });
          } : undefined,
          /** @since 3.10.0 - Map Proxy cache_provider **/
          tileGrid: ('degrees' === projection.getUnits() || 'mapproxy' === this.state.cache_provider) ? new ol.tilegrid.TileGrid({
            // Need to remove the first resolution because in this version of ol createXYZ doesn't accept maxResolution options.
            // The extent of EPSG:4326 is not squared [-180, -90, 180, 90] as EPSG:3857 so the resolution is calculated
            // by Math.max(width(extent)/tileSize,Height(extent)/tileSize)
            // we need to calculate to Math.min instead, so we have to remove the first resolution
            resolutions: ol.tilegrid.createXYZ({ extent: projection.getExtent(), maxZoom: 20 }).getResolutions().slice(1),
            extent:      projection.getExtent(),
          }) : undefined,
        })
      });

    }

    let layerObj;

    /**
     * ORIGINAL SOURCE: src/app/core/layers/layerfactory.js@v3.10.2
     */
    if ('WMS' === this._BASE_LAYER) {
      layerObj = {
        url:          this.state.url,
        projection:   this.getProjectionFromCrs(this.state.crs),
        layers:       this.state.layers,
        tiled:        undefined === this.state.singleTile ? false : this.state.singleTile,
        opacity:      undefined === this.state.opacity ? 1 : this.state.opacity,
      };
    }

    if (this._RASTER_LAYER && 'WMTS' === this.state.type && !resolutions) {
      image = 'tile';
      layerObj = {
        url:               ('mapproxy' === this.state.cache_provider) || !(this.layers[0] && this.layers[0].getWmsUrl) ? this.state.url : this.layers[0].getWmsUrl(),
        id:                this.state.id,
        projection:        this.state.projection,
        iframe_internal:   this.iframe_internal,
        layers:            (withLayers ? this.layers.map(l => l.getWMSLayerName()) : this.layers),
      };
    }

    // WMS LAYER
    if (this._RASTER_LAYER && !olLayer) {
      layerObj = {
        url:             (this.layers[0] && this.layers[0].getWmsUrl) ? this.layers[0].getWmsUrl() : this.state.url,
        id:              this.state.id,
        projection:      this.state.projection,
        iframe_internal: this.iframe_internal,
        layers:          (withLayers) ? this.layers.map(l => l.getWMSLayerName()) : this.layers,
        /** @since 3.9.1 */
        format:          this.state.format,
      };
    }

    if (layerObj) {
      olLayer = new ('tile' === image ? ol.layer.Tile : ol.layer.Image)({
        id:            layerObj.id,
        name:          layerObj.name,
        opacity:       undefined !== layerObj.opacity ? layerObj.opacity : 1.0,
        visible:       layerObj.visible,
        extent:        layerObj.extent,
        maxResolution: layerObj.maxResolution,
        source:        new ('tile' === image ? ol.source.TileWMS : ol.source.ImageWMS)({
          ratio:      1,
          url:        layerObj.url,
          projection: (layerObj.projection) ? layerObj.projection.getCode() : null,
          params:     {
            ...Object.fromEntries(
              Object.entries({
                DPI:         DOTS_PER_INCH,
                TRANSPARENT: true,
                FORMAT:      layerObj.format,
                LAYERS:      undefined !== layerObj.layers      ? layerObj.layers : '',
                VERSION:     undefined !== layerObj.version     ? layerObj.version : '1.3.0',
                SLD_VERSION: undefined !== layerObj.sld_version ? layerObj.sld_version : '1.1.0',
              })
              // prevents sending "FORMAT" parameter when undefined
              .filter(([key, val]) => ('FORMAT' !== key ? true : undefined !== val))
          ),
          ...(this.extraParams || {})
          },
          imageLoadFunction: (layerObj.iframe_internal || 'POST' === this._method)
            ? (tile, url) => {
              fetch('POST' === this._method ? (url || '').split('?')[0] : url, {
                method: this._method,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                body:    'POST' === this._method ? url.split('?')[1] : undefined,
              })
              .then(async response => tile.getImage().src = URL.createObjectURL(await response.blob()))
              .catch(e => { console.error('Invalid tile', ol.TileState.ERROR, e); tile.setState(ol.TileState.ERROR); });
            }
            : undefined,
        })
      });

    }

    if (!olLayer) {
      console.warn('[G3W-LAYER] invalid OL layer');
      return;
    }

    // register loading event
    olLayer.getSource().on(`${image}loadstart`, () => this.emit('loadstart'));
    olLayer.getSource().on(`${image}loadend`,   () => this.emit('loadend'));
    olLayer.getSource().on(`${image}loaderror`, () => this.emit('loaderror'));

    if (!withLayers && this._mapLayer?.config?.attributions) {
      olLayer.getSource().setAttributions(this._mapLayer.config.attributions);
    }

    if (!withLayers && this._mapLayer?.state) {
      olLayer.setVisible(this._mapLayer.state.visible);
    }

    return (this._olLayer = olLayer);
  }

  /**
   * @since 4.1.0
   */
  getLayerConfigs() {
    if (this._RASTER_LAYER) {
      return this.layers;
    }
  }

  /**
   * @since 4.1.0
   */
  addLayer(layer) {
    if (this._RASTER_LAYER && !this.allLayers.find(l => layer === l)) { this.allLayers.push(layer); }
    if (this._RASTER_LAYER && !this.layers.find(l => layer === l))    { this.layers.push(layer); }
    if (this._RASTER_LAYER && 'XYZ' === this.state.type)             { this.layer = layer; }
  }

  /**
   * @since 4.1.0
   */
  removeLayer(layer) {
    if (this._RASTER_LAYER) {
      this.layers = this.layers.filter(l => layer !== l);
    }
  }

  /**
   * @since 4.1.0 
   */
  setupCustomMapParamsToLegendUrl(params = {}) {
    if (this._RASTER_LAYER && 'XYZ' !== this.state.type) {
      [].concat(this.layer || this.layers).forEach(l => Object.assign(l.customParams, params));
    }
  }

  /**
   * @since 4.1.0
   */
  getGetFeatureInfoUrl(coordinate, resolution, epsg, params) {
    if (this._RASTER_LAYER && 'XYZ' !== this.state.type) {
      return this.getOLLayer().getSource().getGetFeatureInfoUrl(coordinate,resolution,epsg,params)
    }
  }

}

/******************************************************************************************
 * LAYER PROPERTIES
 *****************************************************************************************/

/**
 * Layer Types
 */
Layer.LayerTypes = {
  TABLE:  "table",
  IMAGE:  "image",
  VECTOR: "vector"
};

Layer._getProvider = function(name, layer) {
  const provider = new Providers[name];
  // BACKCOMP v3.x
  return Object.assign(provider, {
    _name:       name,
    _layer:      layer,
    getLayer:    () => provider._layer,
    setLayer:    l  => provider._layer = l,
    getFeatures: provider.getFeatures || (() => console.log('overwriteby single provider')),
    query:       provider.query       || (() => console.log('overwriteby single provider')),
    getName:     () => provider._name,
  });
}

/**
 * Response parser (content types)
 * 
 * ORIGINAL SOURCE: src/utils/parsers/index.js@v4.0.0
 * 
 * @example Layer._parse('application/vnd.ogc.gml', { layers, response });
 */
Layer._parse = function(type, params, opts) {

  const Parsers = this.parsers = (this.parsers || {

    'g3w-vector/gml'({ data, layer } = {}) {
      try {
        return (
          new ol.format.WMSGetFeatureInfo({ layers: layer.config?.infolayer || layer.config.origname })
          ).readFeatures(
            // extract gml from multiple (Tuscany region)
            '--' === data.substr(0, 2)
              ? data
                .split(/\r\n--/)
                .filter(part => /<([^ ]*)FeatureCollection/.test(part) || /<([^ ]*)msGMLOutput/.test(part))
                .map(part => part.substr(part.indexOf('<?xml')))
                .pop()
              : data
          );
      } catch(e) {
        console.warn(e);
        return [];
      }
    },

    'g3w-vector/json'(data, options) {
      try {
        return (new ol.format.GeoJSON({
          geometryName:      'geometry',
          dataProjection:    options.crs,
          featureProjection: options.mapCrs || options.crs,
        })).readFeatures('string' === typeof data ? JSON.parse(data) : data)
      } catch (e) {
        console.warn(e);
        return [];
      }
    },

    'application/json'({ response, projections, layers = [], wms = true, filtertoken } = {}) {
      const layersFeatures = layers.map(layer => ({ layer, features: [], filtertoken }));
      const layersId       = layers.map(l => wms ? l.getWMSLayerName() : l.getWFSLayerName());
      // features
      (
        response
          ? (new ol.format.GeoJSON({
              geometryName:          'geometry',
              defaultDataProjection: projections.layer || projections.map,
            })).readFeatures(response)
          : []
      ).filter(feature => {
        const featureId = feature.getId();
        const g3w_fid   = sanitizeFidFeature(featureId);
        // in the case of wms getfeature without a filter return string contain layerName or layerid
        const index = featureId == g3w_fid ? 0 : layersId.indexOf(featureId);
        // skip when ..
        if (-1 === index) {
          return false;
        }
        const props = feature.getProperties();
        feature.set(G3W_FID, g3w_fid);
        // fields
        layersFeatures[index]
          .layer
          .getFields()
          .filter(f => f.show && undefined === props[f.name] && undefined !== props[f.label])
          .forEach(f => feature.set(f.name, props[f.label]));
        // features
        layersFeatures[index].features.push(feature);
      });
      return layersFeatures;
    },

    'application/geojson'({ layers, response } = {}) {
      return response ? layers.map(layer => ({ layer, features: Layer._parse('g3w-vector/json', response, {}) })) : [];
    },

    'text/plain'({ layers, response } = {}) {
      return layers.map(layer => ({ layer, rawdata: response }));
    },

    'text/gml'({ layers, response }) {
      return layers.map(layer => ({ layer, features: Layer._parse('g3w-vector/gml', { data: response, layer: layers[0] }) }));
    },

    'application/vnd.ogc.gml'({ response, projections, layers, wms = true } = {}) {
      // convert XML response to string
      if (response && 'string' !== typeof response && !(response instanceof String)) {
        response = new XMLSerializer().serializeToString(response);
      }

      // sanitize layer name (removes: whitespaces, quotes, parenthesis, slashes)
      if (response) {
        response = layers.reduce((acc, layer, i) => {
          let id = (wms && layer.config.wms_use_layer_ids ? layer.getId() : layer.getName()).replace(/[\s'()/]+/g, s => /\s/g.test(s) && !wms ? '_' : '');
          if (!wms) {
            id = id.replace(/[/\\]+/g, '').replaceAll(':', '-');
          }
          return acc.replace(new RegExp(`qgs:${id}`, 'g'), `qgs:layer${i}`);
        }, response);
      }

      // fields starting with an invalid key
      const invalids = response && Array.from(response.matchAll(/qgs:(\d+(?:\.\d+)?)(\w+)|qgs:(\w+):(\w+)/g)).filter((_, i) => 0 === i % 2);

      // numeric value (integer or float)
      if (invalids) {
        response = invalids.reduce((acc, find) => acc.replace(new RegExp(find[0], 'g'), `qgs:${NUMERIC_FIELD}${find[1]}${find[2]}`), response);
      }

      // HOTFIX: null characther ("\u0000")
      if (response) {
        response = response.replace(new RegExp(String.fromCharCode(0), 'g'), '0');
      }

      const parsed = []; //Array contains item object ({layer, features})
      let xml;

      try {
        xml = (new DOMParser).parseFromString(response, "text/xml");

        // skip when response has no features
        if (!xml.querySelector('FeatureCollection > featureMember')) {
          throw 'no features in response';
        }

        layers.forEach((layer, i) => {

          const cloned = xml.cloneNode(true);
          let feats = [];

          // get layers by name (eg. "qgs:layer0")
          const qgs = [...cloned.querySelectorAll(`FeatureCollection > featureMember > layer${i}`)];

          // set "g3w_fid" attribute from `fid="<layer_name_or_id.fid>"`
          qgs.forEach(feat => {
            const fid = (feat.getAttribute('fid') || '.').split('.')[1];
            if (fid) {
              const g3w_fid = cloned.createElement('gml:' + G3W_FID);
              feat.setAttribute('fid', fid);
              g3w_fid.textContent = fid;
              feat.appendChild(g3w_fid);
            }
            feats.push(feat.parentNode);
          });

          // get multi layers wms (eg. "layer0" → "layer0_0" + "layer1_0")
          if (qgs.length > 1) {
            const grouped = groupBy(qgs, feat => Object.values(feat.children).map(d => d.nodeName));
            if (Object.keys(grouped).length > 1) {
              Object.keys(grouped).forEach((key, i) => grouped[key].forEach((node, j) => {
                // see: https://andreiglingeanu.me/rename-element-tag/
                const renamed = cloned.createElement(`qgs:layer${i}_${j}`);
                [...node.attributes].map(({ name, value }) => { renamed.setAttribute(name, value); });
                while (node.firstChild) { renamed.appendChild(node.firstChild); }
                const feat = cloned.createElement('gml:featureMember');
                feat.appendChild(renamed);
                node.parentNode.insertAdjacentElement('beforebegin', feat);
                if (1 === node.parentNode.children.length) {
                  node.parentNode.parentNode.removeChild(node.parentNode);
                } else {
                  node.parentNode.removeChild(node);
                }
                feats.push(feat);
              }));
            }
          }

          // keep only current layer features
          cloned.querySelectorAll('FeatureCollection > featureMember').forEach(node => {
            if (!feats.includes(node)) {
              node.parentNode.removeChild(node);
            }
          });

          feats = (new ol.format.WMSGetFeatureInfo()).readFeatures(cloned.documentElement.outerHTML);

          // whether need to re-project features
          const is_reprojected = projections.layer && projections.layer.getCode() !== projections.map.getCode() && feats.length && !!feats[0].getGeometry();

          /** @FIXME add description */
          if (feats.length && invalids) {
            const fields = Object.keys(feats[0].getProperties()).filter(p => -1 !== p.indexOf(NUMERIC_FIELD));
            feats.forEach(f => {
              fields.forEach(_field => {
                const invalid = invalids.find(find => `${find[1]}${find[2]}` === _field.replace(NUMERIC_FIELD, ''));
                f.set(invalid[0].replace('qgs:', ''), [].concat(f.get(_field))[0]);
                f.unset(_field);
              })
            });
          }

          // transform features
          if (is_reprojected) {
            //filter feature with geometry
            feats.filter(f => f.getGeometry()).forEach(f => f.setGeometry(f.getGeometry().transform(projections.layer.getCode(), projections.map.getCode())));
          }

          // inverted axis --> reverse features coordinates
          if ('ne' === (projections.layer || projections.map).getAxisOrientation().substr(0, 2)) {
            //filter feature with geometry
            feats.filter(f => f.getGeometry()).forEach(f => f.setGeometry(reverseGeometry(f.getGeometry())));
          }

          // remove Z values added by "ol.format.WMSGetFeatureInfo" readFeatures
          if (layer.isGeoLayer() && !is3DGeometry(layer.getGeometryType())) {
            feats.forEach(f => removeZValue({ feature: f }));
          }

          parsed.unshift({ layer, features: feats });

        });
      } catch (e) {
        console.warn(e);
      }

      /** @since 3.9.1 handle server errors */
      if (xml.querySelector('ServiceException')) {
        GUI.showUserMessage({
          type:        'warning',
          textMessage: true,
          message:     `${layers[0].getName()} - ${xml.querySelector('ServiceException').innerText}`
        })
      }

      return parsed;
    },
  });

  Parsers['g3w-vector/geojson'] = Parsers['g3w-vector/json']; 
  Parsers['text/html']          = Parsers['text/plain']; 

  if (Parsers[type]) {
    return Parsers[type](params, opts);
  }

  return (params?.layers || []).map(layer => ({ layer, rawdata: _('Not supported format') }));
};