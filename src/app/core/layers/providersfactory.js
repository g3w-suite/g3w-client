import ApplicationState            from 'store/application-state';
import RelationsService            from 'services/relations';
import { QUERY_POINT_TOLERANCE }   from 'app/constant';
import { QgsFilterToken }          from 'core/layers/utils/QgsFilterToken';
import { handleQueryResponse }     from 'utils/handleQueryResponse';
import { getDPI }                  from 'utils/getDPI';
import { getExtentForViewAndSize } from 'utils/getExtentForViewAndSize';
import { get_legend_params }       from 'utils/get_legend_params';

const G3WObject                    = require('core/g3wobject');
const {
  XHR,
  appendParams,
  toRawType,
  getTimeoutPromise,
}                                  = require('utils');
const Parsers                      = require('utils/parsers');
const { t }                        = require('core/i18n/i18n.service');
const Feature                      = require('core/layers/features/feature');
const Filter                       = require('core/layers/filter/filter');


const GETFEATUREINFO_IMAGE_SIZE = [101, 101];
const DPI = getDPI();

const is_defined = d => undefined !== d;


/**
 * ORIGINAL SOURCE: src/app/core/layers/providers/provider.js@3.8.6
 */
class DataProvider extends G3WObject {

  constructor(options = {}) {
    super();
    this._isReady                           = false;
    this._name                              = 'provider';
    this._layer                             = options.layer;
    this._hasFieldsStartWithNotPermittedKey = undefined;
  }

  getLayer() {
    return this._layer;
  }

  setLayer(layer) {
    this._layer = layer;
  }

  getFeatures() {
    console.log('overwriteby single provider')
  }

  query() {
    console.log('overwriteby single provider')
  }

  setReady(bool) {
    this._isReady = bool;
  }

  isReady() {
    return this._isReady;
  }

  error() {}

  isValid() {
    console.log('overwriteby single provider');
  }

  getName() {
    return this._name;
  }

  /**
   * Transform xml from server to actual queryresult component
   */
  handleQueryResponseFromServer(response, projections, layers = [this._layer], wms = true) {
    return handleQueryResponse({ response, projections, layers, wms });
  }

  /**
   * @returns {number} set timeout for query
   */
  getQueryResponseTimeoutKey({
    layers = [this._layer],
    resolve,
    query,
  } = []) {
    return getTimeoutPromise({
      resolve,
      data: {
        data: Parsers.response.utils.getTimeoutData(layers),
        query,
      },
    });
  }

}

const Providers = {

  /**
   * ORIGINAL SOURCE: src/app/core/layers/providers/geojsonprovider.js@3.8.6
   */
  geojson: class GEOJSONDataProvider extends DataProvider {

    constructor(options = {}) {
      super(options);
      this._name    = 'geojson';
      this.provider = options.provider
    }

    query(options = {}) {
      return Promise.resolve([]);
    }

    getFeatures(opts = {}) {
      return new Promise((resolve, reject) => {
        const parser = new ol.format.GeoJSON();
        const params = {
          featureProjection: opts.mapProjection,
          dataProjection: opts.projection || 'EPSG:4326',
          // defaultDataProjection: projection // ol v. 4.5
        };
        if (opts.data) {
          resolve(parser.readFeatures(opts.data, params))
        } else {
          XHR.get({ url: opts.url || this.getLayer().get('source').url })
            .then((response) => { resolve(parser.readFeatures(response.results, params)) })
            .catch((err)     => { reject(err) });
        }
      });
    }

    getDataTable({ page } = {}) {
      return new Promise((resolve, reject) => {
        this.getFeatures()
          .then(() => { resolve(this._features) })
          .catch(e => { reject(e) });
      });
    }

    /**
     * @TODO check if deprecated (broken and unusued code ?)
     */
    digestFeaturesForTable() {
      return {
        headers : [],
        features: [],
      };
    }

  },

  /**
   * ORIGINAL SOURCE: src/app/core/layers/providers/qgisprovider.js@3.8.6
   */
  qgis: class QGISProvider extends DataProvider {

    constructor(options = {}) {
      super();
      this._name           = 'qgis';
      this._layer          = options.layer || {};
      this._projections    = { map: null, layer: null };
      this._queryUrl       = this._layer.getUrl('query');       // url referred to query
      this._filtertokenUrl = this._layer.getUrl('filtertoken'); // filtertokenurl
      this._layerName      = this._layer.getName() || null;     // get layer name from QGIS layer, because the query is proxied from g3w-server
      this._infoFormat     = this._layer.getInfoFormat() || 'application/vnd.ogc.gml';

      /** @since 3.9.0 */
      this.saveFilterToken   = QgsFilterToken.save.bind(null, this._filtertokenUrl);
      /** @since 3.9.0 */
      this.applyFilterToken  = QgsFilterToken.apply.bind(null, this._filtertokenUrl);
      /** @since 3.9.0 */
      this.deleteFilterToken = QgsFilterToken.delete.bind(null, this._filtertokenUrl);
      /** @since 3.9.0 */
      this.getFilterToken    = QgsFilterToken.getToken.bind(null, this._filtertokenUrl);
    }

    /**
     * @param { Object } opts
     * @param opts.field
     * @param opts.raw
     * @param opts.suggest
     * @param opts.unique
     * @param opts.formatter
     * @param opts.queryUrl
     * @param opts.ordering
     * @param opts.fformatter since 3.9.0
     * @param opts.ffield     since 3.9.1
     * 
     * @returns {Promise<unknown>}
     */
    async getFilterData({
      field,
      raw = false,
      suggest,
      unique,
      formatter = 1,
      queryUrl,
      ordering,
      fformatter,
      ffield,
    } = {}) {
      const params =  {
        field,
        suggest,
        ordering,
        formatter,
        unique,
        fformatter,
        ffield,
        filtertoken: ApplicationState.tokens.filtertoken
      };
      try {
        const url = queryUrl ? queryUrl : this._layer.getUrl('data');
        const response = field                                                                    // check `field` parameter
          ? await XHR.post({ url, contentType: 'application/json', data: JSON.stringify(params)}) // since g3w-admin@v3.7
          : await XHR.get({ url, params });                                                       // BACKCOMP (`unique` and `ordering` were only GET parameters)

        // vector layer
        if ('table' !== this._layer.getType()) {
          this.setProjections();
        }

        if (raw)                           return response;
        if (unique && response.result)     return response.data;
        if (fformatter && response.result) return response;

        if (response.result) {
          return {
            data: Parsers.response.get('application/json')({
              layers: [this._layer],
              response: response.vector.data,
              projections: this._projections,
            })
          };
        }

      } catch(e) {
        return Promise.reject(e);
      }
      return Promise.reject();
    }

    setProjections() {
      // COMMENTED LAYER PROJECTION: EXPECT ONLY RESULT IN MAP PROJECTION
      // this._projections.layer = this._layer.getProjection();
      this._projections.map = this._layer.getMapProjection() || this._projections.layer;
    }

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
    query(opts = {}) {

      let { filter = null} = opts;

      filter = filter && Array.isArray(filter) ? filter : [filter];

      if (!filter) {
        return Promise.reject();
      }

      return new Promise((resolve, reject) => {

        const is_table = 'table' === this._layer.getType();

        // in case not alphanumeric layer set projection
        if (!is_table) {
          this.setProjections();
        }

        const layers = opts.layers ? opts.layers.map(layer => layer.getWMSLayerName()).join(',') : this._layer.getWMSLayerName();

        // check if geometry filter. If not i have to remove projection layer
        if (filter[0].getType() !== 'geometry') {
          this._projections.layer = null;
        }

        filter = filter.map(filter => filter.get()).filter(value => value);

        XHR
          .get({
            url: opts.queryUrl || this._queryUrl,
            params: {
              SERVICE:       'WMS',
              VERSION:       '1.3.0',
              REQUEST:       'GetFeatureInfo',
              filtertoken:   ApplicationState.tokens.filtertoken,
              LAYERS:        layers,
              QUERY_LAYERS:  layers,
              INFO_FORMAT:   this._infoFormat,
              FEATURE_COUNT: opts.feature_count || 10,
              CRS:           (is_table ? ApplicationState.map.epsg : this._projections.map.getCode()),
              I:             opts.I,
              J:             opts.J,
              FILTER:        filter.length ? filter.join(';') : undefined,
              WITH_GEOMETRY: !is_table,
            },
          })
          .then(response => { resolve(opts.raw ? response : this.handleQueryResponseFromServer(response, this._projections, opts.layers)); })
          .catch(e => reject(e));
      });
    }

    /**
     * get layer config
     */
    getConfig() {
      return XHR.get({ url: this._layer.getUrl('config') });
    }

    getWidgetData(opts = {}) {
      return XHR.get({ url: this._layer.getUrl('widget')[opts.type], params: { fields: opts.fields } });
    };

    /**
     * unlock feature
     */
    unlock() {
      return XHR.post({ url: this._layer.getUrl('unlock') })
    }

    /**
     * commit function (checks for editing) 
     */
    commit(commitItems) {
      return XHR.post({
        url:         this._layer.getUrl('commit'),
        data:        JSON.stringify(commitItems),
        contentType: 'application/json',
      });
    }

    /**
     * Load editing features (Read / Write)
     */
    async getFeatures(options = {}, params = {}) {

      // filter null values
      Object.entries(params).forEach(([key, value]) => {
        if ([null, undefined].includes(value)) {
          delete params[key];
        }
      });

      const urlParams = $.param(params);

      if (!options.editing) {
        const { vector } = await XHR.get({
          url:         this._layer.getUrl('data') + (urlParams ? '?' + urlParams : ''),
          contentType: 'application/json',
        });
        return {
          data:  vector.data,
          count: vector.count
        };
      }


      // check if data are requested in read or write mode;
      let url;
      // editing mode
      let promise;

      url = this._layer.getUrl('editing');

      if (!url) {
        throw 'Url not valid';
      }

      url +=  urlParams ? '?' + urlParams : '';
      const filter = options.filter || null;

      if (!filter)                            promise = XHR.post({ url, contentType: 'application/json' });
      else if (is_defined(filter.bbox))       promise = XHR.post({ url, data: JSON.stringify({ in_bbox: filter.bbox.join(','), filtertoken: ApplicationState.tokens.filtertoken }), contentType: 'application/json' });
      else if (is_defined(filter.fid))        promise = RelationsService.getRelations(filter.fid);
      else if (filter.field)                  promise = XHR.post({ url, data: JSON.stringify(filter), contentType: 'application/json' });
      else if (is_defined(filter.fids))       promise = XHR.get({ url, params: filter });
      else if (is_defined(filter.nofeatures)) promise = XHR.post({ url, data: JSON.stringify({ field: `${filter.nofeatures_field || 'id'}|eq|__G3W__NO_FEATURES__` }), contentType: 'application/json' });


      try {
        const { vector, result, featurelocks } = await promise;  

        // skip when server responde with false result (error)
        if (false === result) {
          throw 'server error';
        }

        const lockIds  = featurelocks.map(l => l.featureid);

        // resolves with features locked and requested
        return {
          count: vector.count, // real number of features that request will return
          features: Parsers[this._layer.getType()]
            .get({ type: 'json'})(vector.data, 'NoGeometry' === vector.geometrytype ? {} : { crs: this._layer.getCrs() })
            .filter(f => lockIds.indexOf(`${f.getId()}`) > -1)
            .map(f => new Feature({ feature: f })),
          featurelocks,
        };
      } catch (error) {
        throw { message: t("info.server_error") };
      }

    }

  },

  /**
   * ORIGINAL SOURCE: src/app/core/layers/providers/wmsprovider.js@3.8.6
   */
  wms: class WMSDataProvider extends DataProvider {

    constructor(options = {}) {
      super(options);
      this._name        = 'wms';
      this._projections = { map: null, layer: null };
    }

    /**
     * @TODO move into WMSDataProvider::query
     */
    _getRequestParameters({
      layers,
      feature_count,
      coordinates,
      infoFormat,
      query_point_tolerance = QUERY_POINT_TOLERANCE,
      resolution,
      size,
    }) {

      const layerNames = layers
        ? layers.map(layer => layer.getWMSInfoLayerName()).join(',')
        : this._layer.getWMSInfoLayerName();

      const extent = getExtentForViewAndSize(coordinates, resolution, 0, size);

      const is_map_tolerance = ('map' === query_point_tolerance.unit);  

      /**
       * Add LEGEND_ON and/or LEGEND_OFF in case of layer that has categories
       * It used to solve issue related to GetFeatureInfo feature layer categories
       * that are unchecked (not visisble) at QGIS project setting
       */
      const LEGEND_PARAMS = {
        LEGEND_ON: [],
        LEGEND_OFF: []
      };

      layers
        .forEach(layer => {
          if (layer.getCategories()) {
            const { LEGEND_ON, LEGEND_OFF } = get_legend_params(layer);
            if (LEGEND_ON)  LEGEND_PARAMS.LEGEND_ON.push(LEGEND_ON);
            if (LEGEND_OFF) LEGEND_PARAMS.LEGEND_OFF.push(LEGEND_OFF);
          }
      });

      return {
        SERVICE:              'WMS',
        VERSION:              '1.3.0',
        REQUEST:              'GetFeatureInfo',
        CRS:                  this._projections.map.getCode(),
        LAYERS:               layerNames,
        QUERY_LAYERS:         layerNames,
        filtertoken:          ApplicationState.tokens.filtertoken,
        INFO_FORMAT:          infoFormat,
        FEATURE_COUNT:        feature_count,
        WITH_GEOMETRY:        true,
        DPI,
        FILTER_GEOM:          is_map_tolerance ? (new ol.format.WKT()).writeGeometry(ol.geom.Polygon.fromCircle(new ol.geom.Circle(coordinates, query_point_tolerance.value))) : undefined,
        FI_POINT_TOLERANCE:   is_map_tolerance ? undefined : query_point_tolerance.value,
        FI_LINE_TOLERANCE:    is_map_tolerance ? undefined : query_point_tolerance.value,
        FI_POLYGON_TOLERANCE: is_map_tolerance ? undefined : query_point_tolerance.value,
        G3W_TOLERANCE:        is_map_tolerance ? undefined : query_point_tolerance.value * resolution,
        I:                    is_map_tolerance ? undefined : Math.floor((coordinates[0] - extent[0]) / resolution), // x
        J:                    is_map_tolerance ? undefined : Math.floor((extent[3] - coordinates[1]) / resolution), // y
        WIDTH:                size[0],
        HEIGHT:               size[1],
        LEGEND_ON:            LEGEND_PARAMS.LEGEND_ON.length ? LEGEND_PARAMS.LEGEND_ON.join(';') : undefined,
        LEGEND_OFF:           LEGEND_PARAMS.LEGEND_OFF.length ? LEGEND_PARAMS.LEGEND_OFF.join(';') : undefined,
        STYLES:               '',
        BBOX:                 ('ne' === this._projections.map.getAxisOrientation().substr(0, 2) ? [extent[1], extent[0], extent[3], extent[2]] : extent).join(','),
      };
    }
  
    query(opts = {}) {

      const infoFormat      = this._layer.getInfoFormat()    || 'application/vnd.ogc.gml';
      this._projections.map = this._layer.getMapProjection() || this._layer.getProjection();

      const {
        layers        = [this._layer],
        feature_count = 10,
        size          = GETFEATUREINFO_IMAGE_SIZE,
        coordinates   = [],
        resolution,
        query_point_tolerance
      } = opts;

      const method = layers[0].isExternalWMS() || !/^\/ows/.test(layers[0].getQueryUrl()) ? 'GET' : layers[0].getOwsMethod();
  
      // base request
      const base_params = {
        url: layers[0].getQueryUrl(),
        params: this._getRequestParameters({
          layers,
          feature_count,
          coordinates,
          infoFormat,
          query_point_tolerance,
          resolution,
          size,
        }),
      }

      return new Promise((resolve, reject) => {
        const timer = this.getQueryResponseTimeoutKey({ layers, resolve, query: { coordinates, resolution } });
        if (layers[0].useProxy()) {
          layers[0]
            .getDataProxyFromServer('wms', { ...base_params, method, headers: { 'Content-Type': infoFormat } })
            .then(d => resolve({
              data: this.handleQueryResponseFromServer(d, this._projections, layers),
              query: { coordinates, resolution },
            }));
        } else {
          this[method]({ ...base_params, layers })
            .then(d => resolve({
              data: this.handleQueryResponseFromServer(d, this._projections, layers),
              query: { coordinates, resolution },
            }))
            .catch(err => reject(err))
            .finally(() => clearTimeout(timer));
        }
      });
    }

    /**
     * @TODO deprecate in favour of a global XHR
     */
    GET({ url, params } = {}) {
      const source = url.split('SOURCE');
      return XHR.get({
        url: (appendParams((source.length ? source[0] : url), params) + (source.length > 1 ? '&SOURCE' + source[1] : ''))
      });
    }

    /**
     * @TODO deprecate in favour of a global XHR
     */
    POST({ url, params } = {}) {
      return XHR.post({ url, data: params });
    }
  
  },

  /**
   * ORIGINAL SOURCE: src/app/core/layers/providers/wmsprovider.js@3.8.6
   */
  wfs: class WFSDataProvider extends DataProvider {

    constructor(options = {}) {
      super(options);
      this._name = 'wfs';
    }

    /**
     * @TODO check if deprecated
     */
    getData() {
      return Promise.resolve();
    }
  
    // query method
    query(opts = {}, params = {}) {

      const {
        reproject     = false,
        feature_count = 10,
        layers        = [this._layer],
        filter,
      } = opts;

      params.MAXFEATURES = feature_count;

      return new Promise((resolve, reject) => {
        const timer = this.getQueryResponseTimeoutKey({ layers, resolve, query: {} });

        this
          ._doRequest(filter, params, layers, reproject)
          .then(response => {
            const data = this.handleQueryResponseFromServer(
              response,
              {
                map: this._layer.getMapProjection(),
                layer: (reproject ? this._layer.getProjection() : null)
              },
              layers,
              false // wms parameter
            );
            // sanitize in case of nil:true
            data.forEach(layer => {
              (layer.features || [])
                .forEach(feature => {
                  Object
                    .entries(feature.getProperties())
                    .forEach(([ attribute, value ]) => {
                      if ('Object' === toRawType(value) && value['xsi:nil']){
                        feature.set(attribute, 'NULL');
                      }
                    });
                });
            });
            resolve({ data });
          })
          .catch(error => reject(error))
          .finally(() => { clearTimeout(timer); });

      });
    };

    /**
     * @TODO move into WFSDataProvider::query
     * 
     * Request to server
     */
    async _doRequest(filter, params = {}, layers, reproject = true) {
      filter = filter || new Filter({});

      // skip when..
      if (!filter) {
        return Promise.reject();
      }

      const layer = layers ? layers[0] : this._layer;
      const type  = filter.getType();

      params = Object.assign(params, {
        SERVICE:      'WFS',
        VERSION:      '1.1.0',
        REQUEST:      'GetFeature',
        TYPENAME:     (layers ? layers.map(layer => layer.getWFSLayerName()).join(',') : layer.getWFSLayerName()),
        OUTPUTFORMAT: layer.getInfoFormat(),
        SRSNAME:      (reproject ? layer.getProjection().getCode() : this._layer.getMapProjection().getCode()),
      });

      let url = (layer.getQueryUrl && layer.getQueryUrl()) || '';
      url     = url.match(/\/$/) ? url : `${url}/`;

      if ('all' === type) {
        return XHR.post({ url, params });
      }

      // spaatial methods. <inteserct, within>
      const { spatialMethod = 'intersects' } = (filter.getConfig && filter.getConfig()) || {};

      let ol_filter;

      switch (type) {

        case 'bbox':
          ol_filter = ol.format.filter.bbox('the_geom', filter.get());
          break;

        case 'geometry':
          ol_filter = ol.format.filter[spatialMethod]('the_geom', filter.get());
          break;

        case 'expression':
          ol_filter = null;
          break;

      }

      try {
        const FILTER  = (new ol.format.WFS().writeGetFeature({ featureTypes: [layer], filter: ol_filter })).children[0].innerHTML;
        params.FILTER = `(${ FILTER })`.repeat(layers ? layers.length : 1);
        if ('GET' === layer.getOwsMethod() && 'geometry' !== filter.getType()) {
          return await XHR.get({ url: url + '?' + $.param(params) });
        } else {
          return XHR.post({ url, params })
        }
      } catch (e) {
        return 200 === e.status ? e.responseText : e;
      }
    }
  
  },

};

class ProviderFactory {

  constructor() {

    this._providers = {

      'QGIS': {
        'virtual': {
          query:       Providers.wms,
          filter:      Providers.wfs,
          data:        Providers.qgis,
          search:      Providers.qgis,
          filtertoken: Providers.qgis,
        },
        'postgres': {
          query:       Providers.wms,
          filter:      Providers.wfs,
          data:        Providers.qgis,
          search:      Providers.qgis,
          filtertoken: Providers.qgis,
        },
        'oracle': {
          query:       Providers.wms,
          filter:      Providers.wfs,
          data:        Providers.qgis,
          search:      Providers.qgis,
          filtertoken: Providers.qgis,
        },
        'mssql': {
          query:       Providers.wms,
          filter:      Providers.wfs,
          data:        Providers.qgis,
          search:      Providers.qgis,
          filtertoken: Providers.qgis,
        },
        'spatialite': {
          query:       Providers.wms,
          filter:      Providers.wfs,
          data:        Providers.qgis,
          search:      Providers.qgis,
          filtertoken: Providers.qgis,
        },
        'ogr': {
          query:       Providers.wms,
          filter:      Providers.wfs,
          data:        Providers.qgis,
          search:      Providers.qgis,
          filtertoken: Providers.qgis,
        },
        'delimitedtext': {
          query:       Providers.wms,
          filter:      Providers.wfs,
          data:        Providers.qgis,
          search:      Providers.qgis,
          filtertoken: Providers.qgis,
        },
        'wmst': {
          query:       Providers.wms,
          filter:      Providers.wfs,
          data:        null,
          search:      null,
        },
        'wcs': {
          query:       Providers.wms,
          filter:      Providers.wfs,
          data:        null,
          search:      null,
        },
        'wms': {
          query:       Providers.wms,
          filter:      Providers.wfs,
          data:        null,
          search:      null,
        },
        'wfs': {
          query:       Providers.wms,
          filter:      Providers.wfs,
          data:        Providers.qgis,
          search:      Providers.qgis,
        },
        'gdal': {
          query:       Providers.wms,
          filter:      null,
          data:        null,
          search:      null,
        },
        /** @since 3.9.0 */
        'postgresraster': {
          query:       Providers.wms,
          filter:      null,
          data:        null,
          search:      null,
        },
        'vector-tile': {
          query:       Providers.wms,
          filter:      null,
          data:        null,
          search:      null,
        },
        'vectortile': {
          query:       Providers.wms,
          filter:      null,
          data:        null,
          search:      null,
        },
        'arcgismapserver': {
          query:       Providers.wms,
          filter:      null,
          data:        null,
          search:      null,
        },
        'mdal': {
          query:       Providers.wms,
          filter:      null,
          data:        null,
          search:      null,
        },
      },
    
      'OGC': {
        'wms': {
          query:      Providers.wms,
          filter:     null,
          data:       null,
          search:     null,
        },
      },
    
      'G3WSUITE': {
        'geojson': {
          query:      Providers.geojson,
          filter:     null,
          data:       Providers.geojson,
          search:     null,
        },
      },

    };

  }

  build(providerType, serverType, sourceType, options) {
    // return instance of selected provider
    const providerClass = this.get(providerType, serverType, sourceType);
    return providerClass ? new providerClass(options) : null;
  }

  get(providerType, serverType, sourceType) {
    return this._providers[serverType][sourceType][providerType];
  }

}

module.exports = new ProviderFactory();
