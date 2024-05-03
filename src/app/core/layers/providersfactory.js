import ApplicationState            from 'store/application-state';
import RelationsService            from 'services/relations';
import { QUERY_POINT_TOLERANCE }   from 'app/constant';
import { QgsFilterToken }          from 'core/layers/utils/QgsFilterToken';
import { handleQueryResponse }     from 'utils/handleQueryResponse';
import { getDPI }                  from 'utils/getDPI';
import { getExtentForViewAndSize } from 'utils/getExtentForViewAndSize';
import { get_legend_params }       from 'utils/get_legend_params';
import { promisify }               from 'utils/promisify';

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

/**
 * Providers
 */
module.exports = {

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
      const d = $.Deferred();
      d.resolve([]);
      return d.promise();
    }

    getFeatures(opts = {}) {
      const d      = $.Deferred();
      const parser = new ol.format.GeoJSON();
      const params = {
        featureProjection: opts.mapProjection,
        dataProjection:    opts.projection || 'EPSG:4326',
        // defaultDataProjection: projection // ol v. 4.5
      };
      if (opts.data) {
        d.resolve(parser.readFeatures(opts.data, params))
      } else {
        XHR.get({ url: opts.url || this.getLayer().get('source').url })
          .then((r)  => d.resolve(parser.readFeatures(r.results, params)) )
          .catch((e) => { console.warn(e); d.reject(e) });
      }
      return d.promise();
    }

    getDataTable({ page } = {}) {
      const d = $.Deferred();
      this.getFeatures()
        .then(()  => d.resolve(this._features) )
        .fail((e) => { console.warn(e); d.reject(e) });
      return d.promise();
    }

    /**
     * @TODO check if deprecated (broken and unused code ?)
     */
    digestFeaturesForTable() {
      return { headers : [], features: [], };
    }

  },

  /**
   * ORIGINAL SOURCE: src/app/core/layers/providers/qgisprovider.js@3.8.6
   */
  qgis: class QGISProvider extends DataProvider {

    constructor(options = {}) {
      super();
      this._name             = 'qgis';
      this._layer            = options.layer || {};
      this._projections      = { map: null, layer: null };
      this._queryUrl         = this._layer.getUrl('query');       // url referred to query
      this._filtertokenUrl   = this._layer.getUrl('filtertoken'); // filtertokenurl
      this._layerName        = this._layer.getName() || null;     // get layer name from QGIS layer, because the query is proxied from g3w-server
      this._infoFormat       = this._layer.getInfoFormat() || 'application/vnd.ogc.gml';

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
        if ('table' !== this._layer.getType()) { this.setProjections(); }

        if (raw)                           return response;
        if (unique && response.result)     return response.data;
        if (fformatter && response.result) return response;

        if (response.result) {
          return {
            data: Parsers.response.get('application/json')({
              layers:      [this._layer],
              response:    response.vector.data,
              projections: this._projections,
            })
          };
        }

      } catch(e) {
        console.warn(e);
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
      const d        = $.Deferred();

      const is_table = 'table' === this._layer.getType();

      // in case not alphanumeric layer set projection
      if (!is_table) { this.setProjections(); }

      const layers = opts.layers ? opts.layers.map(layer => layer.getWMSLayerName()).join(',') : this._layer.getWMSLayerName();

      let { filter = null } = opts;
      filter = filter && Array.isArray(filter) ? filter : [filter];

      // check if geometry filter. If not i have to remove projection layer
      if (filter && 'geometry' !== filter[0].getType()) {
        this._projections.layer = null;
      }

      if (filter) {

        filter = filter.map(f => f.get()).filter(v => v);

        XHR.get({
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
          .then(response => {
            if (opts.raw) { d.resolve(response); }
            else { d.resolve(this.handleQueryResponseFromServer(response, this._projections, opts.layers)); }
          })
          .catch(e => { console.warn(e); d.reject(e); });
      } else {
        d.reject();
      }

      return d.promise();
    }

    /**
     * get layer config
     */
    getConfig() {
      const d   = $.Deferred();
      const url = this._layer.getUrl('config');
      if (url) {
        XHR.get({ url })
          .then(config => d.resolve(config))
          .catch(e => { console.warn(e); d.reject(e) });
      } else {
        d.reject('not valid url');
      }
      return d.promise();
    }

    getWidgetData(opts = {}) {
      //@TODO Need to replace with XHR. editing and signaler_iim plugins depend on this method
      return $.get(this._layer.getUrl('widget')[opts.type], { fields: opts.fields });
    };

    /**
     * unlock feature
     */
    unlock() {
      const d = $.Deferred();
      XHR.post({ url: this._layer.getUrl('unlock') })
        .then((r)  => d.resolve(r) )
        .catch((e) => { console.warn(e); d.reject(e) });
      return d.promise();
    }

    /**
     * commit function (checks for editing) 
     */
    commit(commitItems) {
      const d = $.Deferred();
      XHR.post({
        url:         this._layer.getUrl('commit'),
        data:        JSON.stringify(commitItems),
        contentType: 'application/json',
      })
        .then((r)  => d.resolve(r) )
        .catch((e) => { console.warn(e); d.reject(e); });
      return d.promise();
    }

    /**
     * Load editing features (Read / Write)
     */
    getFeatures(options = {}, params = {}) {
      const d = $.Deferred();

      // filter null values
      Object
        .entries(params)
        .forEach(([key, value]) => {
          if ([null, undefined].includes(value)) {
            delete params[key];
          }
        });


      const urlParams = $.param(params);

      if (!options.editing) {
        XHR.get({
          url: this._layer.getUrl('data') + (urlParams ? '?' + urlParams : ''),
        })
          .then(({ vector }) => d.resolve({ data:  vector.data, count: vector.count }) )
          .catch((e)         => { console.warn(e); d.reject(e); })

        return d.promise();
      }
      // check if data are requested in read or write mode;
      let url;
      // editing mode
      let promise;
      url = this._layer.getUrl('editing');
      if (!url) {
        d.reject('Url not valid');
        return;
      }
      url +=  urlParams ? '?' + urlParams : '';
      const filter = options.filter || null;

      if (!filter) {
        promise = XHR.post({
          url,
          contentType: 'application/json',
        });
      } else if (is_defined(filter.bbox)) { // bbox filter
        promise = XHR.post({
          url,
          data: JSON.stringify({
            in_bbox:     filter.bbox.join(','),
            filtertoken: ApplicationState.tokens.filtertoken
          }),
          contentType: 'application/json',
        })
      } else if (is_defined(filter.fid)) { // fid filter
        promise = RelationsService.getRelations(filter.fid);
      } else if (filter.field) {
        promise = XHR.post({
          url,
          data: JSON.stringify(filter),
          contentType: 'application/json',
        })
      } else if (is_defined(filter.fids)) {
        promise = XHR.get({
          url,
          params: filter
        })
      } else if (is_defined(filter.nofeatures)) {
        promise = XHR.post({
          url,
          data: JSON.stringify({
            field: `${filter.nofeatures_field || 'id'}|eq|__G3W__NO_FEATURES__`
          }),
          contentType: 'application/json'
        })
      }

      promise
        .then(({ vector, result, featurelocks }) => {
          // skip when server responde with false result (error)
          if (false === result) {
            d.reject({ message: t("info.server_error") });
            return;
          }
          const features = [];
          const lockIds  = featurelocks.map(lock => lock.featureid);
          Parsers[this._layer.getType()]
            .get({ type: 'json'})(
              vector.data,
              ('NoGeometry' === vector.geometrytype) ? {} : { crs: this._layer.getCrs(), /*mapCrs: this._layer.getMapCrs()*/ } 
            )
            .forEach(feature => {
              if (lockIds.indexOf(`${feature.getId()}`) > -1) {
                features.push(new Feature({ feature }));
              }
            });
          // resolves with features locked and requested
          d.resolve({
            count: vector.count, // real number of features that request will return
            features,
            featurelocks,
          });
        })
        .catch((e) => { console.warn(e); d.reject({ message: t("info.server_error")}) });

      return d.promise();
    }

  },

  /**
   * ORIGINAL SOURCE: src/app/core/layers/providers/wmsprovider.js@3.8.6
   */
  wms: class WMSDataProvider extends DataProvider {

    constructor(options = {}) {
      super(options);
      this._name = 'wms';
    }

    query(opts = {}) {
      const d = $.Deferred();

      const projection = this._layer.getMapProjection() || this._layer.getProjection();

      const {
        layers        = [this._layer],
        size          = GETFEATUREINFO_IMAGE_SIZE,
        coordinates   = [],
        resolution,
      } = opts;

      const extent     = getExtentForViewAndSize(coordinates, resolution, 0, size);
      const tolerance  = undefined !== opts.query_point_tolerance ? opts.query_point_tolerance : QUERY_POINT_TOLERANCE;
      const url        = layers[0].getQueryUrl();

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
        FEATURE_COUNT:        undefined !== opts.feature_count ? opts.feature_count : 10,
        WITH_GEOMETRY:        true,
        DPI,
        FILTER_GEOM:          'map' === tolerance.unit ? (new ol.format.WKT()).writeGeometry(ol.geom.Polygon.fromCircle(new ol.geom.Circle(coordinates, tolerance.value))) : undefined,
        FI_POINT_TOLERANCE:   'map' === tolerance.unit ? undefined : tolerance.value,
        FI_LINE_TOLERANCE:    'map' === tolerance.unit ? undefined : tolerance.value,
        FI_POLYGON_TOLERANCE: 'map' === tolerance.unit ? undefined : tolerance.value,
        G3W_TOLERANCE:        'map' === tolerance.unit ? undefined : tolerance.value * resolution,
        I:                    'map' === tolerance.unit ? undefined : Math.floor((coordinates[0] - extent[0]) / resolution), // x
        J:                    'map' === tolerance.unit ? undefined : Math.floor((extent[3] - coordinates[1]) / resolution), // y
        WIDTH:                size[0],
        HEIGHT:               size[1],
        STYLES:               '',
        BBOX:                 ('ne' === projection.getAxisOrientation().substr(0, 2) ? [extent[1], extent[0], extent[3], extent[2]] : extent).join(','),
        // HOTFIX for GetFeatureInfo requests and feature layer categories that are not visible (unchecked) at QGIS project setting
        LEGEND_ON:            layers.flatMap(l => get_legend_params(l).LEGEND_ON).filter(Boolean).join(';')  || undefined,
        LEGEND_OFF:           layers.flatMap(l => get_legend_params(l).LEGEND_OFF).filter(Boolean).join(';') || undefined,
      }

      const timer  = this.getQueryResponseTimeoutKey({ layers, resolve: d.resolve, query: { coordinates, resolution } });
      const method =  layers[0].getOwsMethod();
      const source = (url || '').split('SOURCE');

      let promise;

      if (layers[0].useProxy()) {
        promise = layers[0].getDataProxyFromServer('wms', { url, params, method, headers: { 'Content-Type': params.INFO_FORMAT } });
      } else if ('GET' === method) {
        promise = XHR.get({ url: (appendParams((source.length ? source[0] : url), params) + (source.length > 1 ? '&SOURCE' + source[1] : '')) });
      } else if ('POST' === method) {
        promise = XHR.post({ url, data: params });
      } else {
        promise = Promise.resolve();
        console.warn('unsupported method: ', method);
      }

      promisify(promise)
        .then(data => d.resolve({
          data: handleQueryResponse({
            response: data,
            projections: { map: projection, layer: null },
            layers,
            wms: true,
          }),
          query: { coordinates, resolution }
        }))
        .catch(err => d.reject(err))
        .finally(() => !layers[0].useProxy() && clearTimeout(timer))

      return d.promise();
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
      return $.Deferred().promise();
    }
  
    // query method
    query(opts = {}, params = {}) {

      const d = $.Deferred();

      const {
        reproject     = false,
        feature_count = 10,
        layers        = [this._layer],
        filter,
      } = opts;

      params.MAXFEATURES = feature_count;

      const timeoutKey = this.getQueryResponseTimeoutKey({
        layers,
        resolve: d.resolve,
        query: {},
      });
  
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
                Object.entries(feature.getProperties())
                  .forEach(([ attribute, value ]) => {
                    if ('Object' === toRawType(value) && value['xsi:nil']){
                      feature.set(attribute, 'NULL');
                    }
                  });
              });
          });
          d.resolve({ data });
        })
        .fail((e)  => { console.warn(e); d.reject(e); })
        .always(() => { clearTimeout(timeoutKey); });

      return d.promise();
    };

    _post(url, params) {
      const d = $.Deferred();
      XHR.post({
        url:  url.match(/\/$/) ? url : `${url}/`,
        data: params
      })
        .then((r) => d.resolve(r))
        .catch((e) => { console.warn(e); d.reject(e); });
      return d.promise();
    };

    _get(url, params) {
      const d = $.Deferred();
      XHR.get({
        url: (url.match(/\/$/) ? url : `${url}/`) + '?' + $.param(params)
      }) // transform parameters
        .then((r) => d.resolve(r))
        .catch((e) => { console.warn(e); d.reject(e); });

      return d.promise();
    };

    /**
     * @TODO move into WFSDataProvider::query
     * 
     * Request to server
     */
    _doRequest(filter, params = {}, layers, reproject = true) {
      const d = $.Deferred();

      filter  = filter || new Filter({});

      // skip when..
      if (!filter) {
        d.reject();
        return d.promise();
      }

      const layer = layers ? layers[0] : this._layer;

      params = Object.assign(params, {
        SERVICE:      'WFS',
        VERSION:      '1.1.0',
        REQUEST:      'GetFeature',
        TYPENAME:     (layers ? layers.map(layer => layer.getWFSLayerName()).join(',') : layer.getWFSLayerName()),
        OUTPUTFORMAT: layer.getInfoFormat(),
        SRSNAME:      (reproject ? layer.getProjection().getCode() : this._layer.getMapProjection().getCode()),
      });

      let ol_filter;

      switch (filter.getType()) {

        case 'all':
          return this._post(layer.getQueryUrl(), params);

        case 'bbox':
          ol_filter = ol.format.filter.bbox('the_geom', filter.get());
          break;

        case 'geometry':
          //spatial methods. <inteserct, within>
          const {spatialMethod = 'intersects'} = filter.getConfig();
          ol_filter = ol.format.filter[spatialMethod]('the_geom', filter.get());
          break;

        case 'expression':
          ol_filter = null;
          break;

      }

      (
        'GET' === layer.getOwsMethod() && 'geometry' !== filter.getType()
          ? this._get
          : this._post
      )(
        layer.getQueryUrl(),
        {
          ...params,
          FILTER: `(${(
            new ol.format.WFS().writeGetFeature({
              featureTypes: [layer],
              filter:       ol_filter,
            })
          ).children[0].innerHTML})`.repeat(layers ? layers.length : 1),
        }
      )
        .then((r) => d.resolve(r))
        .fail((e) => {
          if (200 === e.status) {
            d.resolve(e.responseText);
          } else {
            console.warn(e);
            d.reject(e);
          }
        });

      return d.promise()
    }
  
  },

};