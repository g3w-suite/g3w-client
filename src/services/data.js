/**
 * @file
 * @since v3.6
 */
import { G3W_FID, QUERY_POINT_TOLERANCE }        from 'app/constant';
import ProjectsRegistry                          from 'store/projects';
import ApplicationService                        from 'services/application';
import GUI                                       from 'services/gui';
import IFrameRouterService                       from 'services/iframe';
import { getQueryLayersPromisesByCoordinates }   from 'utils/getQueryLayersPromisesByCoordinates';
import { groupBy }                               from 'utils/groupBy';
import { getMapLayersByFilter }                  from 'utils/getMapLayersByFilter';
import { XHR }                                   from 'utils/XHR';
import { $promisify, promisify }                 from 'utils/promisify';

const { t }  = require('core/i18n/i18n.service');
const Filter = require('core/layers/filter/filter');

const DataService = {

  currentoutputplaces: ['gui'], // array contains all

  /**
   * Object contain output function to show results
   * @type {{gui(*=, *=): void, iframe(*=, *=): void}}
   * dataPromise: is a promise request for data,
   * options: {
   *   show: method or Boolean to set if show or not the result on output
   *   before: async function to handle data return from server
   *   after: method to handle or do some this after show data
   * }
   */
  ouputplaces: {

    async gui(promise, opts = {}) {
      GUI.setLoadingContent(true);
      try {
        GUI.outputDataPlace(promise, opts);
        await promise;
      } catch(e) {
        console.warn(e);
      }
      GUI.setLoadingContent(false);
    },

    async iframe(promise, opts = {}) {
      IFrameRouterService.outputDataPlace(promise, opts);
    }

  },

  /**
   * @param contextAndMethod 'String contain type of service(search or query): method'
   * @param options
   * 
   * @returns {Promise<void>}
   */
  async getData(contextAndMethod, options = {}) {
    const [ context, method ]           = (contextAndMethod || '').split(':');
    const { inputs = {}, outputs = {} } = options;
    //return a promise and not the data
    const promise = DataService.services[context][method](inputs);
    if (outputs) {
      DataService.currentoutputplaces.forEach(p => DataService.ouputplaces[p](promise, outputs));
    }
    return await (await promise);
  },

};

/**
 * @returns {Promise<void>}
 */
DataService.init = async () => {
  DataService.services = {

    /**
     * ORIGINAL SOURCE: src/services/data-query.js@v3.9.3
     */
    query: new (class {
      
      /**
       * @param {{ feature: unknown, feature_count: unknown, filterConfig: unknown, multilayers: boolean, condition: boolean, excludeLayers: unknown[] }}
       * 
       * @returns {Promise<unknown>}
       */
      polygon({
        feature,
        feature_count   = ProjectsRegistry.getCurrentProject().getQueryFeatureCount(),
        filterConfig    = {},
        multilayers     = false,
        condition       = { filtrable: { ows: 'WFS' } },
        /** @since 3.8.0 */
        layerName       = '',
        /** @since 3.8.0 */
        excludeSelected = null,
        /** @since 3.8.0 **/
        external = {
          add: true,
          filter: {
            SELECTED : false
          }
        },
        /**@since 3.9.0**/
        type = 'polygon'
      } = {}) {
        const fid      = GUI.getService('catalog').state.external.vector.some(l => l.selected) ? feature.getId() : feature.get(G3W_FID);
        const geometry = feature.getGeometry();

        // in case no geometry on polygon layer response
        if (!geometry) {
          return Promise.resolve({
            data:   [],
            usermessage: {
              type:        'warning',
              message:     `${layerName} - ${t('sdk.mapcontrols.querybypolygon.no_geometry')}`,
              messagetext: true,
              autoclose:   false
            },
            result: true,
            error:  true
          });
        }
        return this.handleRequest(
          // request
          getQueryLayersPromisesByGeometry(
            // layers
            getMapLayersByFilter({
              ...(
                "boolean" === typeof excludeSelected
                  ? { SELECTED: !excludeSelected }
                  : { SELECTED_OR_ALL: true }
              ),
              FILTERABLE: true,
              VISIBLE: true
            }, condition),
            // options
            {
              geometry,
              multilayers,
              feature_count,
              filterConfig,
              projection: ProjectsRegistry.getCurrentProject().getProjection()
            }
          ),
          // query
          {
            fid,
            geometry,
            layerName,
            type,
            filterConfig,
            external
          }
        );
      }

      /**
       *
       * @param bbox
       * @param feature_count
       * @param multilayers
       * @param condition
       * @param filterConfig
       * @param addExternal
       * @param layersFilterObject
       * @returns {Promise<unknown>}
       */
      bbox({
        bbox,
        feature_count      = ProjectsRegistry.getCurrentProject().getQueryFeatureCount(),
        filterConfig       = {},
        multilayers        = false,
        condition          = { filtrable: { ows: 'WFS' } },
        /** @since 3.8.0 **/
        addExternal = true,
        layersFilterObject = { SELECTED_OR_ALL: true, FILTERABLE: true, VISIBLE: true }
      } = {}) {

        // Check If LayerIds is length === 0 so i check if add external Layer is selected
        if (GUI.getService('catalog').state.external.vector.some(l => l.selected)) {
          return this.handleRequest($promisify(Promise.resolve([])), {
            bbox,
            type: 'bbox',
            filterConfig,
            external: {
              add: addExternal,
              filter: {
                SELECTED: true
              }
            },
          });
        }

        return this.handleRequest(getQueryLayersPromisesByGeometry(
          // layers
          getMapLayersByFilter(layersFilterObject, condition),
          // options
          {
            geometry: ol.geom.Polygon.fromExtent(bbox),
            feature_count,
            filterConfig,
            multilayers,
            projection: GUI.getService('map').getMap().getView().getProjection(),
          })
        );

      }

      /**
       * @param {{ coordinates: unknown, layerIds: unknown[], multilayers: boolean, query_point_tolerance: number, feature_count: number }}
       * 
       * @returns {Promise<unknown>}
       */
      async coordinates({
        coordinates,
        layerIds              = [],                   // see: `QueryResultsService::addLayerFeaturesToResultsAction()`
        multilayers           = false,
        query_point_tolerance = QUERY_POINT_TOLERANCE,
        /** @since 3.8.0 **/
        addExternal = true,
        feature_count
      } = {}) {
        const query = {
          coordinates,
          type: 'coordinates',
          external: {
            add: addExternal,
            filter: {
              SELECTED: GUI.getService('catalog').state.external.vector.some(l => l.selected)
            }
          }
        };

        // Return an empty request if an external layer is selected
        if (query.external.filter.SELECTED && 0 === layerIds.length) {
          return this.handleRequest($promisify(Promise.resolve([])), query);
        }

        const layersFilterObject = {
          QUERYABLE: true,
          SELECTED_OR_ALL: (0 === layerIds.length),
          VISIBLE: true
        };


        if (Array.isArray(layerIds)) {
          layerIds.forEach(id => {
            if (!layersFilterObject.IDS) { layersFilterObject.IDS = []; }
            layersFilterObject.IDS.push(id);
          });
        }

        const layers = getMapLayersByFilter(layersFilterObject);

        // set external property `add: false` in case
        // of selected layer in order to avoid querying
        // a temporary layer (external layer)

        if (1 === layers.length && layers[0].isSelected()) {
          query.external.add = false;
        }

        return this.handleRequest(
          // request
          getQueryLayersPromisesByCoordinates(
            // layers
            layers,
            // options
            {
              multilayers,
              feature_count,
              query_point_tolerance,
              coordinates
            }
          ),
          // query
          query
        );

      }

      /**
      * Wrap jQuery request promise with native Promise
      * @param request is a Promise(jquery promise)
      * @param query
      * @returns {Promise<unknown>}
      */
      handleRequest(request, query = {}) {
        return new Promise((resolve, reject) => {
          request
            .then(response => {
              resolve({
                query,
                type:   'ows',
                data:   (response || []).map(({ data = [] }) => data).flat(),
                result: true // set result to true
              });
            })
            .fail(e => { console.warn(e); reject(e) })
        })
      }

    }),

    /**
     * ORIGINAL SOURCE: src/services/data-search.js@v3.9.3
     */
    search: new (class {

      /**
       * @TODO deprecate search_endpoint
       * 
       * Method to search features
       * 
       * @param options.layer
       * @param { 'api' | 'ows' } options.search_endpoint
       * @param options.filter
       * @param options.raw
       * @param options.queryUrl
       * @param options.feature_count
       * @param options.formatter
       * @param options.ordering
       * 
       * @returns { Promise<{ data: [], query: { type: 'search', search: * }, type: 'api' | 'ows' }> }
       */
      async features(options = {
        layer,
        search_endpoint,
        filter,
        raw: false,
        queryUrl,
        feature_count,
        formatter: 1,
        ordering,
      }) {
        
        options.search_endpoint = options.search_endpoint || 'api';

        let promises                  = [];
        const { layer, ...params }    = options;
        const { raw = false, filter } = options;
        let data                      = [];
        const layers                  = [].concat(layer);         // check if layer is array
        params.filter                 = [].concat(params.filter); // check if filter is array
    
        // if 'api' or 'ows' search_endpoint
        if ('api' === params.search_endpoint) {
          promises = layers.map((l, i) => l.searchFeatures({ ...params, filter: params.filter[i] }));
        } else {
          promises = [new Promise((resolve, reject) => {
            layers[0]                                                  // get query provider for get one request only
            .getProvider('search')
            .query({ ...params, layers, ...layers[0].getSearchParams() /* get search params*/ })
            .then(data => { resolve(data)})
            .fail(e => { console.warn(e); reject(e) })
          })];
        }
    
        (await Promise.allSettled(promises))
          // filter only fulfilled response
          .filter(d => 'fulfilled' === d.status)
          .forEach(({ value } = {}) => {
            if (raw) {
              data.push({ data: value });
            } else if ('api' !== params.search_endpoint) {
              data = value.data = undefined === value.data ? [] : value.data;
            } else if (Array.isArray(value.data) && value.data.length > 0) {
              data.push(value.data[0]);
            }
          });
    
        return {
          data,
          query: {
            type:   'search',
            search: filter,
          },
          type: params.search_endpoint,
        };
      }
    
      /**
       * Return feature from api
       * 
       * @param opts.layer
       * @param opts.formatter
       * @param opts.fids
       * 
       * @returns { Promise<{ data: Array<{ layer: *, features: []}>, query: { type: 'search' }}> } 
       */
      async fids({
        layer,
        formatter = 0,
        fids      = [],
      } = {}) {
        const features = []; 
        try {
          const feats = layer && await layer.getFeatureByFids({ fids, formatter });
          // convert API response to Open Layer Features
          if (feats) {
            feats.forEach(f => {
              const properties    = undefined !== f.properties ? f.properties : {}
              properties[G3W_FID] = f.id;
              const olFeat          = new ol.Feature(f.geometry && new ol.geom[f.geometry.type](f.geometry.coordinates));
              olFeat.setProperties(properties);
              olFeat.setId(f.id);
              features.push(olFeat)
            });
          }
        } catch(e) {
          console.warn(e);
        }
        return {
          data: [{
            layer,
            features
          }],
          query: { type: 'search' },
        };
      }
    
      /**
       * Search service function to load many layers with each one with its fids
       * 
       * @param options.layers    - Array of layers that we want serach fids features
       * @param options.fids      - Array of array of fids
       * @param options.formatter - how we want visualize
       * 
       * @returns { Promise<{ data: [], query: { type: 'search' }}> }
       */
      async layersfids({
        layers    = [],
        fids      = [],
        formatter = 0,
      } = {}) {
        const promises = [];
        const data     = [];
        layers.forEach((layer, i) => { promises.push(this.fids({ layer, fids: fids[i], formatter })) });
        try {
          (await Promise.all(promises)).forEach(response => { data.push(response.data) });
        } catch(e) {
          console.warn(e);
        }
        return {
          data,
          query: { type: 'search' }
        };
      }
    
    }),

    /**
     * ORIGINAL SOURCE: src/services/data-expression.js@v3.9.3
     */
    expression: new (class {

      /**
       * POST only: accepts
       * 
       * Mandatory JSON body: expression
       * Optional JSON body: form_data and qgs_layer_id (QGIS layer id)
       * 
       * @param params.qgis_layer_id layer id owner of the form data
       * @param params.layer_id      layer owner of the data
       * @param params.form_data
       * @param params.field_name    since 3.8.0
       * @param params.expression
       * @param params.formatter
       * @param params.parent
       * 
       * @returns { Promise<void> }
       */
      async expression(params= {}) {
        try {
          const response = XHR.post({
            url:         `${ProjectsRegistry.getCurrentProject().getUrl('vector_data')}${params.layer_id}/`,
            contentType: 'application/json',
            data:        JSON.stringify(params),
          });
          return response.result ? (response.vector.data.features || []) : null;
        } catch(e) {
          console.warn(e);
          return Promise.reject(e);
        }

      }

      /**
       * POST only method to return QGIS Expressions evaluated in Project an optional Layer/Form context
       *
       * Mandatory JSON body: expression
       * Optional JSON body: form_data and qgs_layer_id (QGIS layer id)
       * 
       * @param params.layer_id
       * @param params.qgis_layer_id
       * @param params.form_data
       * @param params.field_name    since 3.8.0
       * @param params.expression
       * @param params.formatter
       * @param params.parent
       * 
       * @returns { Promise<void> }
       */
      expression_eval(params = {}) {
        return XHR.post({
          url:         ProjectsRegistry.getCurrentProject().getUrl('expression_eval'),
          contentType: 'application/json',
          data:        JSON.stringify(params),
        });
      }
    
    }),

    /**
     * ORIGINAL SOURCE: src/services/data-proxy.js@v3.9.3
     */
    proxy: new (class {
      /**
       *
       * @param data: Object conitans data to pass to proxy
       * @returns {Promise<{data: string, response: *}>}
       */
      async wms({ url, method='GET', params={}, headers={} } = {}) {
        let proxyUrl = `${ApplicationService.getProxyUrl()}`;
        if (method === 'GET') {
          url = new URL(url);
          Object.keys(params).forEach(param => url.searchParams.set(param, params[param]));
          url = url.toString();
        }
        try {
          const data = JSON.stringify({
            url,
            params,
            headers,
            method
          });
          const response = await XHR.post({
            url: proxyUrl,
            contentType: 'application/json',
            data
          });
          return {
            response,
            data
          };
        } catch(e) {
          console.warn(e);
          return;
        }
      }

      /**
       * Generic proxy data function
       * @param params
       */
      data(params = {}) {}
    }),

    /**
     * ORIGINAL SOURCE: src/services/data-ows.js@v3.9.3
     */
    ows: new (class {
      /**
       * @param params
       * 
       * @returns {Promise<{data: string, response: *}>}
       */
      async wmsCapabilities({url} ={}) {
        const owsUrl = `${ApplicationService.getInterfaceOwsUrl()}`;
        try {
          const params = {
            url,
            service: "wms"
          };
          const data     = JSON.stringify(params);
          return await XHR.post({
            url: owsUrl,
            contentType: 'application/json',
            data
          });
        } catch(e) {
          console.warn(e);
          return;
        }
      }
    }),

  };
};

/**
 * @param layers
 * @param { Object } opts
 * @param opts.multilayers
 * @param opts.bbox
 * @param opts.geometry
 * @param opts.projection
 * @param opts.feature_count
 * 
 * @returns { JQuery.Promise<any, any, any> }
 */
function getQueryLayersPromisesByGeometry(layers,
  {
    geometry,
    projection,
    filterConfig  = {},
    multilayers   = false,
    feature_count = 10
  } = {}
) {
  const queryResponses = [];
  const queryErrors    = [];
  const mapCrs         = projection.getCode();
  const filter         = new Filter(filterConfig);

  /** In case of no features  */
  if (0 === layers.length) {
    return $promisify(Promise.resolve([]));
  }

  return $promisify(new Promise((resolve, reject) => {

    /** Group query by layers instead single layer request  */
    if (multilayers) {
      const multiLayers = groupBy(layers, l => `${l.getMultiLayerId()}_${l.getProjection().getCode()}`);
      let i             = Object.keys(multiLayers).length;

      for (let key in multiLayers) {
        const layerCrs = multiLayers[key][0].getProjection().getCode();
        // Convert filter geometry from `mapCRS` to `layerCrs`
        filter.setGeometry(mapCrs === layerCrs ? geometry : geometry.clone().transform(mapCrs, layerCrs));
        multiLayers[key][0]
          .getProvider('filter')
          .query({ filter, layers: multiLayers[key], feature_count })
          .then(response => queryResponses.push(response))
          .fail(e => { console.warn(e); queryErrors.push(e) })
          .always(() => {
            i -= 1;
            if (0 === i) {
              queryErrors.length === Object.keys(multiLayers).length
                ? reject(queryErrors)
                : resolve(queryResponses)
            }
          });
      }
    } else {

      let i = layers.length;
      layers.forEach(layer => {
        const layerCrs = layer.getProjection().getCode();
        // Convert filter geometry from `mapCRS` to `layerCrs`
        filter.setGeometry(mapCrs === layerCrs ? geometry : geometry.clone().transform(mapCrs, layerCrs));
        layer
          .query({ filter, filterConfig, feature_count })
          .then(response => queryResponses.push(response))
          .fail(e => { console.warn(e); queryErrors.push(e); })
          .always(() => {
            i -= 1;
            if (0 === i) {
              (queryErrors.length === layers.length)
                ? reject(queryErrors)
                : resolve(queryResponses)
            }
          })
      });
    }
  }));
}

export default DataService;