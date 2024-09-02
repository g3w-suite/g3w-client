import G3WObject                   from 'core/g3wobject';
import ApplicationState            from 'store/application-state';
import RelationsService            from 'services/relations';
import { QUERY_POINT_TOLERANCE }   from 'app/constant';
import { QgsFilterToken }          from 'utils/QgsFilterToken';
import { ResponseParser }          from 'utils/parsers';
import { handleQueryResponse }     from 'utils/handleQueryResponse';
import { getDPI }                  from 'utils/getDPI';
import { getExtentForViewAndSize } from 'utils/getExtentForViewAndSize';
import { get_legend_params }       from 'utils/get_legend_params';
import { XHR }                     from 'utils/XHR';
import { appendParams }            from 'utils/appendParams';
import { getTimeoutPromise }       from 'utils/getTimeoutPromise';
import { promisify, $promisify }   from 'utils/promisify';

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

}

/**
 * Providers
 */
module.exports = {

  /**
   * ORIGINAL SOURCE: src/app/core/layers/providers/geojsonprovider.js@3.8.6
   */
  geojson: class GEOJSONDataProvider extends DataProvider {

    constructor(opts = {}) {
      super(opts);
      this._name    = 'geojson';
      this.provider = opts.provider
    }

    query(opts = {}) {
      return $promisify(Promise.resolve([]));
    }

    getFeatures(opts = {}) {
      return $promisify(async() => {
        return (new ol.format.GeoJSON()).readFeatures(
          opts.data || (await XHR.get({ url: opts.url || this.getLayer().get('source').url })).results, {
          featureProjection: opts.mapProjection,
          dataProjection:    opts.projection || 'EPSG:4326',
          // defaultDataProjection: projection // ol v. 4.5
        });
      });
    }

    getDataTable({ page } = {}) {
      return $promisify(async() => {
        await(promisify(this.getFeatures()));
        return this._features;
      });
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

    constructor(opts = {}) {
      super();
      this._name             = 'qgis';
      this._layer            = opts.layer || {};
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
      raw       = false,
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

        if (raw)                           { return response }
        if (unique && response.result)     { return response.data }
        if (fformatter && response.result) { return response }

        if (response.result) {
          return {
            data: ResponseParser.get('application/json')({
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
      return $promisify(async () => {
        const is_table = 'table' === this._layer.getType();

        // in case not alphanumeric layer set projection
        if (!is_table) { this.setProjections(); }

        const layers = opts.layers ? opts.layers.map(l => l.getWMSLayerName()).join(',') : this._layer.getWMSLayerName();

        let { filter = null } = opts;
        filter = filter && Array.isArray(filter) ? filter : [filter];

        // skip when ..
        if (!filter) {
          return Promise.reject();
        }

        // check if geometry filter. If not i have to remove projection layer
        if (filter && 'geometry' !== filter[0].getType()) {
          this._projections.layer = null;
        }

        filter = filter.map(f => f.get()).filter(v => v);

        const response = await XHR.get({
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
        });

        return opts.raw ? response : handleQueryResponse({
          response,
          projections: this._projections,
          layers:      undefined === opts.layers ? [this._layer] : opts.layers,
          wms:         true,
        });

      });
    }

    /**
     * get layer config
     */
    getConfig() {
      const url = this._layer.getUrl('config');
      return $promisify(url ? XHR.get({ url }) : Promise.reject('not valid url'));

    }

    getWidgetData(opts = {}) {
      return $promisify(XHR.get({url: this._layer.getUrl('widget')[opts.type], params: { fields: opts.fields }}))
    };

    /**
     * unlock feature
     */
    unlock() {
      return $promisify(XHR.post({ url: this._layer.getUrl('unlock') }));
    }

    /**
     * commit function (checks for editing) 
     */
    commit(commitItems) {
      return $promisify(XHR.post({
        url:         this._layer.getUrl('commit'),
        data:        JSON.stringify(commitItems),
        contentType: 'application/json',
      }));
    }

    /**
     * Load editing features (Read / Write)
     */
    getFeatures(options = {}, params = {}) {

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
        return $promisify(async () => {
          const { vector } = await XHR.get({
            url: this._layer.getUrl('data') + (urlParams ? '?' + urlParams : ''),
          });
          return { data: vector.data, count: vector.count };
        });
      }

      return $promisify(new Promise((resolve, reject) => {
        // check if data are requested in read or write mode;
        let url;
        // editing mode
        let promise;
        url = this._layer.getUrl('editing');
        if (!url) {
          reject('Url not valid');
          return;
        }
        url += urlParams ? '?' + urlParams : '';
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
            data:        JSON.stringify(filter),
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
          .then(({vector, result, featurelocks}) => {
            // skip when server responde with false result (error)
            if (false === result) {
              reject({ message: t("info.server_error") });
              return;
            }
            const features = [];
            const lockIds  = featurelocks.map(lk => lk.featureid);
            ResponseParser.get(`g3w-${this._layer.getType()}/json`)(
              vector.data,
              ('NoGeometry' === vector.geometrytype) ? {} : { crs: this._layer.getCrs(), /*mapCrs: this._layer.getMapCrs()*/ }
            )
              .forEach(feature => {
                if (lockIds.includes(`${feature.getId()}`)) {
                  features.push(new Feature({ feature }));
                }
              });
            // resolves with features locked and requested
            resolve({
              count: vector.count, // real number of features that request will return
              features,
              featurelocks,
            });
          })
          .catch(e => { console.warn(e); reject({ message: t("info.server_error")}) });
      }))

    }

  },

  /**
   * ORIGINAL SOURCE: src/app/core/layers/providers/wmsprovider.js@3.8.6
   */
  wms: class WMSDataProvider extends DataProvider {

    constructor(opts = {}) {
      super(opts);
      this._name = 'wms';
    }

    query(opts = {}) {
      return $promisify(new Promise(async (resolve, reject) => {
        const projection = this._layer.getMapProjection() || this._layer.getProjection();

        const {
          layers        = [this._layer],
          size          = GETFEATUREINFO_IMAGE_SIZE,
          coordinates   = [],
          resolution,
        } = opts;

        const extent     = getExtentForViewAndSize(coordinates, resolution, 0, size);
        const tolerance  = undefined === opts.query_point_tolerance ? QUERY_POINT_TOLERANCE : opts.query_point_tolerance;
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
          FEATURE_COUNT:        undefined === opts.feature_count ? 10 : opts.feature_count,
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

        const timer = getTimeoutPromise({
          resolve,
          data: {
            data:  (layers || []).map(layer => ({ layer, rawdata: 'timeout' })),
            query: { coordinates, resolution },
          },
        });

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

        try {
          const data = await promise;
          resolve({
            data: handleQueryResponse({
              response:    data,
              projections: { map: projection, layer: null },
              wms:         true,
              layers,
            }),
            query: { coordinates, resolution }
          })
        } catch(e) {
          console.warn(e);
          reject(e);
        } finally {
          if (!layers[0].useProxy()) {
            clearTimeout(timer)
          }
        }
      }))

    }
  },

  /**
   * ORIGINAL SOURCE: src/app/core/layers/providers/wmsprovider.js@3.8.6
   */
  wfs: class WFSDataProvider extends DataProvider {

    constructor(opts = {}) {
      super(opts);
      this._name = 'wfs';
    }

    /**
     * @TODO check if deprecated
     */
    getData() {
      return $promisify(() => {});
    }
  
    // query method
    query(opts = {}, params = {}) {
      return $promisify(new Promise(async (resolve, reject) => {
        const filter = opts.filter || new Filter({});
        const layers = opts.layers || [this._layer];
        const url    = `${layers[0].getQueryUrl()}/`.replace(/\/+$/, '/');
        const method = layers[0].getOwsMethod();

        const timer = getTimeoutPromise({
          resolve,
          data: {
            data: (layers || []).map(layer => ({ layer, rawdata: 'timeout' })),
            query: {},
          },
        });

        let promise;

        params = Object.assign(params, {
          SERVICE:      'WFS',
          VERSION:      '1.1.0',
          REQUEST:      'GetFeature',
          MAXFEATURES:  undefined === opts.feature_count ? 10 : opts.feature_count,
          TYPENAME:     layers.map(l => l.getWFSLayerName()).join(','),
          OUTPUTFORMAT: layers[0].getInfoFormat(),
          SRSNAME:      (opts.reproject ? layers[0].getProjection() : this._layer.getMapProjection()).getCode(),
          FILTER:       'all' !== filter.getType() ? `(${(
            new ol.format.WFS().writeGetFeature({
              featureTypes: [layers[0]],
              filter:       ({
                'bbox':       ol.format.filter.bbox('the_geom', filter.get()),
                'geometry':   ol.format.filter[(filter.getConfig() || {}).spatialMethod || 'intersects']('the_geom', filter.get()),
                'expression': null,
              })[filter.getType()],
            })
          ).children[0].innerHTML})`.repeat(layers.length || 1) : undefined
        });

        if ('GET' === method && !['all', 'geometry'].includes(filter.getType())) {
          promise = XHR.get({ url: url + '?' + $.param(params) });
        }

        if ('POST' === method || ['all', 'geometry'].includes(filter.getType())) {
          promise = XHR.post({ url, data: params })
        }

        (promise || Promise.reject())
          .then(response => {
            const data = handleQueryResponse({
              response,
              layers,
              projections: {
                map:   this._layer.getMapProjection(),
                layer: (opts.reproject ? this._layer.getProjection() : null)
              },
              wms: false
            });
            // sanitize in case of nil:true
            data
              .flatMap(l => l.features || [])
              .forEach(f => Object.entries(f.getProperties())
                .forEach(([ attribute, value ]) => value && value['xsi:nil'] && feature.set(attribute, 'NULL'))
              );
            resolve({ data });
          })
          .catch(e  => { console.warn(e); reject(e) } )
          .finally(() => clearTimeout(timer));
      }))

    };

  },

};