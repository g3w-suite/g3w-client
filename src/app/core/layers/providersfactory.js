import ApplicationState            from 'store/application-state';
import RelationsService            from 'services/relations';
import { QUERY_POINT_TOLERANCE }   from 'constant';

const G3WObject                    = require('core/g3wobject');
const {
  XHR,
  appendParams,
  toRawType,
  getTimeoutPromise,
  resolve: resolvedValue
}                                  = require('core/utils/utils');
const {
  handleQueryResponse,
  get_LEGEND_ON_LEGEND_OFF_Params, 
}                                  = require('core/utils/geo');
const Parsers                      = require('core/utils/parsers');
const { t }                        = require('core/i18n/i18n.service');
const Feature                      = require('core/layers/features/feature');
const geoutils                     = require('core/utils/ol');
const Filter                       = require('core/layers/filter/filter');


//overwrite method to read feature
// da un geojson
const GETFEATUREINFO_IMAGE_SIZE = [101, 101];
const DPI = geoutils.getDPI();

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
      const d = $.Deferred();
      d.resolve([]);
      return d.promise();
    }

    getFeatures(opts = {}) {
      const d      = $.Deferred();
      const parser = new ol.format.GeoJSON();
      const params = {
        featureProjection: opts.mapProjection,
        dataProjection: opts.projection || 'EPSG:4326',
        // defaultDataProjection: projection // ol v. 4.5
      };
      if (opts.data) {
        d.resolve(parser.readFeatures(opts.data, params))
      } else {
        $
          .get({ url: opts.url || this.getLayer().get('source').url })
          .then((response) => { d.resolve(parser.readFeatures(response.results, params)) })
          .fail((err)      => { d.reject(err) });
      }
      return d.promise()
    }

    getDataTable({ page } = {}) {
      const d = $.Deferred();
      this
        .getFeatures()
        .then(() => { d.resolve(this._features) })
        .fail((err) => { d.reject(err) });
      return d.promise();
    }

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
    }

    /*
    * token: current token if provide
    * action: create, update, delete
    */

    async deleteFilterToken() {
      await XHR.get({ url: this._filtertokenUrl, params: { mode: 'delete' } });
    }

    async getFilterToken(params = {}) {
      try {
        return (await XHR.get({ url: this._filtertokenUrl, params }) || {}).filtertoken;
      } catch(e) {
        return Promise.reject(e);
      }
    }

    async getFilterData({
      field,
      raw = false,
      suggest = {},
      unique,
      formatter = 1,
      queryUrl,
      ordering,
    } = {}) {
      try {
        let response = await XHR.get({
          url: `${queryUrl ? queryUrl : this._layer.getUrl('data')}`,
          params: {
            field,
            suggest,
            ordering,
            formatter,
            unique,
            filtertoken: ApplicationState.tokens.filtertoken
          },
        });

        // vector layer
        if ('table' !== this._layer.getType()) {
          this.setProjections()
        }

        if (raw)                       return response;
        if (unique && response.result) return response.data;
        if (response.result)           return { data: Parsers.response.get('application/json')({ layers: [this._layer], response: response.vector.data, projections: this._projections }) };

        return Promise.reject();

      } catch(e) {
        return Promise.reject(e);
      }
    }

    setProjections() {
      // COMMENTED LAYER PROJECTION: EXPECT ONLY RESULT IN MAP PROJECTION
      // this._projections.layer = this._layer.getProjection();
      this._projections.map = this._layer.getMapProjection() || this._projections.layer;
    }

    /**
     * Query by filter
     * 
     * @param {boolean} opts.raw whether to get raw response
     * @param opts.feature_count maximun feature for request
     * @param opts.queryUrl url for request data
     * @param opts.layers Array or request layers
     * @param opts.I wms parameter request
     * @param opts.J wms parameter request
     */
    query(opts = {}) {
      const d = $.Deferred();

      //in case not alphanumeric layer set projection
      if ('table' !== this._layer.getType()) {
        this.setProjections();
      }

      const layers = opts.layers ? opts.layers.map(layer => layer.getWMSLayerName()).join(',') : this._layer.getWMSLayerName();

      let { filter = null} = opts;
      filter = filter && Array.isArray(filter) ? filter : [filter];

      if (filter) {
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
              CRS:           ('table' === this._layer.getType() ? ApplicationState.map.epsg : this._projections.map.getCode()),
              I:             opts.I,
              J:             opts.J,
              FILTER:        filter.length ? filter.join(';') : undefined,
              WITH_GEOMETRY: 'table' !== this._layer.getType()
            },
          })
          .then(response => d.resolve(
            (opts.raw || false)
              ? response
              : this.handleQueryResponseFromServer(response, this._projections, opts.layers)
            )
          )
          .catch(e => d.reject(e));
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
        $.get(url)
          .then(config => d.resolve(config))
          .fail(e => d.reject(e));
      } else {
        d.reject('not valid url');
      }
      return d.promise();
    }

    getWidgetData(opts = {}) {
      return $.get(this._layer.getUrl('widget')[opts.type], { fields: opts.fields });
    };

    /**
     * unlock feature
     */
    unlock() {
      const d = $.Deferred();
      $.post(this._layer.getUrl('unlock'))
        .then(response => d.resolve(response))
        .fail(e => d.reject(e));
      return d.promise();
    }

    /**
     * commit function (checks for editing) 
     */
    commit(commitItems) {
      const d = $.Deferred();
      $.post({
        url:         this._layer.getUrl('commit'),
        data:        JSON.stringify(commitItems),
        contentType: 'application/json',
      })
        .then(response => d.resolve(response))
        .fail(e => d.reject(e));
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
        $.get({
          url:         this._layer.getUrl('data') + (urlParams ? '?' + urlParams : ''),
          contentType: 'application/json',
        })
          .then(({ vector }) => {
            d.resolve({ data:  vector.data, count: vector.count })
          })
          .fail(e => d.reject(e))

        return d.promise();
      }
      // check if data are requested in read or write mode;
      let url;
      //editing mode
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
      } else {
        if (filter.bbox) { // bbox filter
          promise = XHR.post({
            url,
            data: JSON.stringify({
              in_bbox:     filter.bbox.join(','),
              filtertoken: ApplicationState.tokens.filtertoken
            }),
            contentType: 'application/json',
          })
        } else if (filter.fid) { // fid filter
          promise = RelationsService.getRelations(filter.fid);
        } else if (filter.field) {
          promise = XHR.post({
            url,
            data: JSON.stringify(filter),
            contentType: 'application/json',
          })
        } else if (filter.fids) {
          promise = XHR.get({
            url,
            params: filter
          })
        } else if (filter.nofeatures) {
          promise = XHR.post({
            url,
            data: JSON.stringify({
              field: `${filter.nofeatures_field || 'id'}|eq|__G3W__NO_FEATURES__`
            }),
            contentType: 'application/json'
          })
        }
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
        .catch(e => d.reject({ message: t("info.server_error")}));

      return d.promise();
    }

    /**
     * @TODO check if deprecated (broken and unusued code ?)
     */

    /*
    _loadLayerData(mode, customUrlParameters) {
      const d = $.Deferred();
      Object.entries(this._layers).forEach(([layerCode, layer]) => {
        if (_.isNull(layer.vector)) noVectorlayerCodes.push(layerCode);
      });
      const vectorLayersSetup = noVectorlayerCodes.map(layerCode => this._setupVectorLayer(layerCode));
      this.emit('loadingvectorlayersstart');
      $.when.apply(this, vectorLayersSetup)
        .then(() => {
          const vectorLayersCodes = Array.prototype.slice.call(arguments);
          this.emit('loadingvectolayersdatastart');
          this.loadAllVectorsData(vectorLayersCodes)
            .then(() => {
              this._vectorLayersCodes = vectorLayersCodes;
              d.resolve(vectorLayersCodes);
              this.emit('loadingvectorlayersend');
              this.setReady(true);
            })
            .fail((e) =>  {
              this._layers.forEach(layer => layer.vector = null);
              d.reject(e);
              this.emit('errorloadingvectorlayersend');
              this.setReady(false);
            })
        })
        .fail((e) => {
          this.setReady(false);
          this.emit('errorloadingvectorlayersend');
          d.reject(e);
        });
      return d.promise();
    }
    */

    /**
     * @TODO check if deprecated (broken and unusued code ?)
     */
    /*setVectorLayersCodes(codes) {
      this._vectorLayersCodes = codes;
    }*/

    /**
     * @TODO check if deprecated (broken and unusued code ?)
     */
    /*getVectorLayersCodes() {
      return this._vectorLayersCodes;
    }*/

    /**
     * @TODO check if deprecated (broken and unusued code ?)
     */
    // getLayers() {
    //   return this._layers;
    // }

    /**
     * @TODO check if deprecated (broken and unusued code ?)
     */
    /*
    reloadVectorData(layerCode) {
      const d = $.Deferred();
      this.
        _createVectorLayerFromConfig(layerCode)
        .then(layer => {
          this._getVectorLayerData(layer, this._mapService.state.bbox)
            .then((response) => {
              this.setVectorLayerData(layer[this._editingApiField], response);
              layer.setData(response.vector.data);
              d.resolve(layer);
            });
        })
        .fail((e) => d.reject(e))
      return d.promise();
    }
    */

    /**
     * @TODO check if deprecated (broken and unusued code ?)
     */
    /*
    loadAllVectorsData(layerCodes) {
      const d = $.Deferred();
      const bbox = this._mapService.state.bbox;

      if (this._loadedExtent && ol.extent.containsExtent(this._loadedExtent, bbox)) {
        return resolvedValue();
      }

      this._loadedExtent = this._loadedExtent ? ol.extent.extend(this._loadedExtent, bbox) : bbox;

      let layers = this._layers;
      if (layerCodes) {
        layers = [];
        layerCodes
          .forEach(layerCode => layers.push(this._layers[layerCode]));
      }

      $.when.apply(this,
        layers.map(Layer => this._loadVectorData(Layer.vector, bbox)))
        .then(() => d.resolve(layerCodes))
        .fail((e) => d.reject(e));

      return d.promise();
    }
    */
    /**
     * @TODO check if deprecated (broken and unusued code ?)
     */
    /*
    _setCustomUrlParameters(urlParams) {
      this._customUrlParameters = urlParams;
    };
    */

    /**
     * @TODO check if deprecated (broken and unusued code ?)
     */
   /* _checkVectorGeometryTypeFromConfig(vectorConfig) {
      switch (vectorConfig.geometrytype) {
        case 'Line':      vectorConfig.geometrytype = 'LineString';      break;
        case 'MultiLine': vectorConfig.geometrytype = 'MultiLineString'; break;
      }
      return vectorConfig;
    }*/

    /**
     * @TODO check if deprecated (broken and unusued code ?)
     */
    /*_createVectorLayerFromConfig(layerCode) {
      const d = $.Deferred();

      const layerConfig = this._layers[layerCode];

      this._getVectorLayerConfig(layerConfig[this._editingApiField])
        .then(response => {
          const config = this._checkVectorGeometryTypeFromConfig(response.vector);
          const crs    = layerConfig.crs || this._mapService.getProjection().getCode();
          const layer = this._createVectorLayer({
            geometrytype: config.geometrytype,
            format:       config.format,
            crs:          this._mapService.getProjection().getCode(),
            crsLayer:     crs,
            id:           layerConfig.id,
            name:         layerConfig.name,
            editing:      this._editingMode,
          });
          layer.setFields(config.fields);
          layer.setCrs(crs);
          if (config.relations) {
            layer.lazyRelations = true;
            layer.setRelations(config.relations);
          }
          if (layerConfig.style) {
            layer.setStyle(layerConfig.style);
          }
          d.resolve(layer);
        })
        .fail((e) => d.reject(e));

      return d.promise();
    }*/

    /**
     * @TODO check if deprecated (broken and unusued code ?)
     */
    /*_setupVectorLayer(layerCode) {
      const d = $.Deferred();
      this._createVectorLayerFromConfig(layerCode)
        .then(layer => {
          this._layers[layerCode].vector = layer;
          d.resolve(layerCode);
        })
        .fail((e) => d.reject(e));
      return d.promise();
    };*/

    /**
     * @TODO check if deprecated (broken and unusued code ?)
     */
    /*_loadVectorData(layer, bbox) {
      return this._getVectorLayerData(layer, bbox)
        .then(response => {
          this.setVectorLayerData(layer[this._editingApiField], response);
          if (this._editingMode && response.featurelocks) {
            this.setVectorFeaturesLock(layer, response.featurelocks);
          }
          layer.setData(response.vector.data);
          if (this._) {
            return response;
          }
        })
        .fail(() => false)
    }*/

    /**
     * @TODO check if deprecated (broken and unusued code ?)
     */
    /* getVectorLayerData(layerCode) {
      return this._vectorLayersData[layerCode];
    }*/

    /**
     * @TODO check if deprecated (broken and unusued code ?)
     */
    /*getVectorLayersData() {
      return this._vectorLayersData;
    }*/


    /**
     * @TODO check if deprecated (broken and unusued code ?)
     */
    /*setVectorLayerData(layerCode, layerData) {
      this._vectorLayersData[layerCode] = layerData;
    }*/


    /**
     * @TODO check if deprecated (broken and unusued code ?)
     */
    // setVectorFeaturesLock(layer, lock) {
    //   _.differenceBy(lock, layer.getFeatureLocks(), 'featureid')
    //     .forEach((newLockId) => { layer.addLockId(newLockId) });
    // }


    /**
     * @TODO check if deprecated (broken and unusued code ?)
     */
    // cleanVectorFeaturesLock(layer) {
    //   layer.cleanFeatureLocks();
    // }

    /**
     * @TODO check if deprecated (broken and unusued code ?)
     */
    /*lockFeatures(layerName) {
      const d = $.Deferred();
      $.get(this._baseUrl + layerName + "/?lock" + this._customUrlParameters + "&in_bbox=" + this._mapService.state.bbox.join(','))
        .done(data => {
          this.setVectorFeaturesLock(this._layers[layerName].vector, data.featurelocks);
          d.resolve(data);
        })
        .fail((e) => d.reject(e));
      return d.promise();
    }*/

    /**
     * @TODO check if deprecated (broken and unusued code ?)
     */
    /*_getVectorLayerConfig(layerApiField) {
      const d = $.Deferred();
      $.get(this._baseUrl + layerApiField + "/?config" + this._customUrlParameters)
        .done(data => d.resolve(data))
        .fail((e) => d.reject(e));
      return d.promise();
    }*/

    /**
     * @TODO check if deprecated (broken and unusued code ?)
     */
    /*_getVectorLayerData(layer, bbox) {
      const d = $.Deferred();
      $.get(this._baseUrl + layer[this._editingApiField] + ('w' == this.getMode() ? '/?editing' : '/?') + this._customUrlParameters + "&in_bbox=" + bbox.join(','))
        .done(data => d.resolve(data))
        .fail((e) => d.reject(e));
      return d.promise();
    }*/

    /**
     * @TODO check if deprecated (broken and unusued code ?)
     */
    /*_createVectorLayer(opts = {}) {
      return new VectorLayer(opts);
    }*/

    /**
     * @TODO check if deprecated (broken and unusued code ?)
     */
    /*cleanUpLayers() {
      this._loadedExtent = null;
    }
    */
  
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

      const extent = geoutils.getExtentForViewAndSize(coordinates, resolution, 0, size);

      let PARAMS_TOLERANCE = (
        ('map' === query_point_tolerance.unit) ? //case true
          {
            FILTER_GEOM: (new ol.format.WKT()).writeGeometry(
              ol.geom.Polygon.fromCircle(new ol.geom.Circle(coordinates, query_point_tolerance.value))
            ),
          } : //case false
          {
            FI_POINT_TOLERANCE:   query_point_tolerance.value,
            FI_LINE_TOLERANCE:    query_point_tolerance.value,
            FI_POLYGON_TOLERANCE: query_point_tolerance.value,
            G3W_TOLERANCE:        query_point_tolerance.value * resolution,
            I:                    Math.floor((coordinates[0] - extent[0]) / resolution), // x
            J:                    Math.floor((extent[3] - coordinates[1]) / resolution), // y
          }
      );

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
            const { LEGEND_ON, LEGEND_OFF } = get_LEGEND_ON_LEGEND_OFF_Params(layer);
            if (LEGEND_ON)  LEGEND_PARAMS.LEGEND_ON.push(LEGEND_ON);
            if (LEGEND_OFF) LEGEND_PARAMS.LEGEND_OFF.push(LEGEND_OFF);
          }
        });

      return {
        SERVICE:       'WMS',
        VERSION:       '1.3.0',
        REQUEST:       'GetFeatureInfo',
        CRS:           this._projections.map.getCode(),
        LAYERS:        layerNames,
        QUERY_LAYERS:  layerNames,
        filtertoken:   ApplicationState.tokens.filtertoken,
        INFO_FORMAT:   infoFormat,
        FEATURE_COUNT: feature_count,
        WITH_GEOMETRY: true,
        DPI,
        ...PARAMS_TOLERANCE,
        WIDTH:         size[0],
        HEIGHT:        size[1],
        LEGEND_ON:     LEGEND_PARAMS.LEGEND_ON.length ? LEGEND_PARAMS.LEGEND_ON.join(';') : undefined,
        LEGEND_OFF:    LEGEND_PARAMS.LEGEND_OFF.length ? LEGEND_PARAMS.LEGEND_OFF.join(';') : undefined,
        STYLES: '',
        BBOX: ('ne' === this._projections.map.getAxisOrientation().substr(0, 2) ? [extent[1], extent[0], extent[3], extent[2]] : extent).join(','),
      };
    }
  
    query(opts = {}) {
      const d = $.Deferred();

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

      const handleResponse = response => {
        d.resolve({
          data: this.handleQueryResponseFromServer(response, this._projections, layers),
          query: { coordinates, resolution },
        })
      };

      const base_params = {
        url: layers[0].getQueryUrl(), //url request
        //parameter used by method request
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

      const timeoutKey = this.getQueryResponseTimeoutKey({
        layers,
        resolve: d.resolve,
        query: { coordinates, resolution },
      });
      
      if (layers[0].useProxy()) {
        layers[0]
          .getDataProxyFromServer('wms', { ...base_params, method, headers: { 'Content-Type': infoFormat } })
          .then(handleResponse);
      } else {
        this[method]({ ...base_params, layers })
          .then(handleResponse)
          .catch(err => d.reject(err))
          .finally(() => clearTimeout(timeoutKey));
      }

      return d.promise();
    }
  
    GET({ url, params } = {}) {
      const source = url.split('SOURCE');
      return XHR.get({
        url: (appendParams((source.length ? source[0] : url), params) + (source.length > 1 ? '&SOURCE' + source[1] : ''))
      });
    }
  
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
  
      this._doRequest(filter, params, layers, reproject)
        .then(response => {
          const data = this.handleQueryResponseFromServer(
            response,
            {
              map: this._layer.getMapProjection(),
              layer: (reproject ? this._layer.getProjection() : null)
            },
            layers,
            false //wms parameter
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
        .fail(error => d.reject(error))
        .always(() => { clearTimeout(timeoutKey); });

      return d.promise();
    };
  
    _post(url, params) {
      const d = $.Deferred();
      $.post(url.match(/\/$/) ? url : `${url}/`, params)
        .then(response => d.resolve(response))
        .fail(error => d.reject(error));
      return d.promise();
    };
  
    // get request
    _get(url, params) {
      const d = $.Deferred();
      $.get((url.match(/\/$/) ? url : `${url}/`) + '?' + $.param(params)) // transform parameters
        .then(response => d.resolve(response))
        .fail(error => d.reject(error));
      return d.promise();
    };
  
    // request to server
    _doRequest(filter, params = {}, layers, reproject = true) {
      const d = $.Deferred();

      filter = filter || new Filter({});

      if (filter) {
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
            //speatial methos. <inteserct, within>
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
          .then(response => d.resolve(response))
          .fail(err => {
            if (err.status === 200) {
              d.resolve(err.responseText);
            } else {
              d.reject(err)
            }
          });
      } else { //no filter set
        d.reject();
      }

      return d.promise()
    }
  
  },

  /**
   * ORIGINAL SOURCE: src/app/core/layers/providers/kmlprovider.js@3.8.6
   */
  // kml: class KMLDataProvider extends DataProvider {

  //   constructor(options = {}) {
  //     super(options);
  //     this._name = 'kml';
  //   }
  
  //   getData() {
  //     return $.Deferred().promise();
  //   }

  // },

  /**
   * ORIGINAL SOURCE: src/app/core/layers/providers/xmlprovider.js@3.8.6
   */
  // xml: class XMLDataProvider extends DataProvider {

  //   constructor(options = {}) {
  //     super();
  //     this._name = 'xml';
  //   }
  
  //   getData() {
  //     return $.Deferred().promise();
  //   }

  // },


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
    // return instace of seletced provider
    const providerClass = this.get(providerType, serverType, sourceType);
    return providerClass ? new providerClass(options) : null;
  }

  get(providerType, serverType, sourceType) {
    return this._providers[serverType][sourceType][providerType];
  }

}

module.exports = new ProviderFactory();
