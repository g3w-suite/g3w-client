/**
 * @file
 * @since v3.6
 */
import { G3W_FID, QUERY_POINT_TOLERANCE }        from 'app/constant';
import ProjectsRegistry                          from 'store/projects';
import ApplicationService                        from 'services/application';
import GUI                                       from 'services/gui';
import IFrameRouterService                       from 'services/iframe';
import { splitContextAndMethod }                 from 'utils/splitContextAndMethod';
import { getFeaturesFromResponseVectorApi }      from 'utils/getFeaturesFromResponseVectorApi';
import { getQueryLayersPromisesByCoordinates }   from 'utils/getQueryLayersPromisesByCoordinates';
import { getQueryLayersPromisesByGeometry }      from 'utils/getQueryLayersPromisesByGeometry';
import { getQueryLayersPromisesByBBOX }          from 'utils/getQueryLayersPromisesByBBOX';
import { getMapLayersByFilter }                  from 'utils/getMapLayersByFilter';
import { createOlFeatureFromApiResponseFeature } from 'utils/createOlFeatureFromApiResponseFeature';
import { resolve }                               from 'utils/resolve';
import { XHR }                                   from 'utils/XHR';

const { t } = require('core/i18n/i18n.service');

const DataService = {

  defaultoutputplaces: ['gui'], // set deafult outputplace
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

    async gui(dataPromise, options = {}) {
      GUI.setLoadingContent(true);
      try {
        GUI.outputDataPlace(dataPromise, options);
        await dataPromise;
      } catch(e) {
        console.warn(e);
      }
      GUI.setLoadingContent(false);
    },

    async iframe(dataPromise, options = {}) {
      IFrameRouterService.outputDataPlace(dataPromise, options);
    }

  },

  /**
   * @param contextAndMethod 'String contain type of service(search or query): method'
   * @param options
   * 
   * @returns {Promise<void>}
   */
  async getData(contextAndMethod, options = {}) {
    const { context, method }     = splitContextAndMethod(contextAndMethod);
    const service                 = DataService.getService(context);
    const {inputs={}, outputs={}} = options;
    //return a promise and not the data
    const dataPromise = service[method](inputs);
    if (outputs) {
      DataService.currentoutputplaces.forEach(p => DataService.ouputplaces[p](dataPromise, outputs));
    }
    //return always data
    return await (await dataPromise);
  },

  /**
   * Force to show empty output data
   */
  showEmptyOutputs() {
    DataService.currentoutputplaces.forEach(p => DataService.ouputplaces[p](Promise.resolve({ data: [] })));
  },

  /**
   * Set a costum datapromiseoutput to applicationa outputs settede
   * 
   * @param dataPromise
   */
  showCustomOutputDataPromise(dataPromise) {
    DataService.currentoutputplaces.forEach(place => DataService.ouputplaces[place](dataPromise, {}));
  },

  /**
   * @param serviceName
   * 
   * @returns {*}
   */
  getService(serviceName) {
    return DataService.services[serviceName]
  },

  setOutputPlaces(places = []) {
    DataService.currentoutputplaces = places;
  },

  /**
   * @param place
   */
  addCurrentOutputPlace(place) {
    if (place && -1 === DataService.currentoutputplaces.indexOf(place)) {
      DataService.currentoutputplaces.push(place);
    }
  },

  /**
   * @param place
   * @param method has to get two parameters data (promise) and options (Object)
   * ex {
   * place: <newplace>
   * method(dataPromise, options={}) {}
   *   }
   */
  addNewOutputPlace({ place, method = () => {} } = {}) {
    let added = false;
    if (undefined === DataService.ouputplaces[place] ) {
      DataService.ouputplaces[place] = method;
      added = true;
    }
    return added;
  },

  // reset default configuration
  resetDefaultOutput() {
    DataService.currentoutputplaces = [...DataService.defaultoutputplaces];
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
    query: new (class extends BaseService {
      
      constructor() {
        super();
        /** @type {{filtrable: {ows: string}}} */
        this.condition = { filtrable: { ows: 'WFS' } };
      }

      /**
       * @param {{ feature: unknown, feature_count: unknown, filterConfig: unknown, multilayers: boolean, condition: boolean, excludeLayers: unknown[] }}
       * 
       * @returns {Promise<unknown>}
       */
      polygon({
        feature,
        feature_count   = this.project.getQueryFeatureCount(),
        filterConfig    = {},
        multilayers     = false,
        condition       = this.condition,
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
        const hasExternalLayersSelected = this.hasExternalLayerSelected({ type: "vector" });
        const fid                       = (hasExternalLayersSelected) ? feature.getId() : feature.get(G3W_FID);
        const geometry                  = feature.getGeometry();

        // in case no geometry on polygon layer response
        if (!geometry) {
          return this.returnExceptionResponse({
            usermessage: {
              type: 'warning',
              message: `${layerName} - ${t('sdk.mapcontrols.querybypolygon.no_geometry')}`,
              messagetext: true,
              autoclose: false
            }
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
              projection: this.project.getProjection()
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
       * @param excludeSelected
       * @param addExternal
       * @param layersFilterObject
       * @returns {Promise<unknown>}
       */
      bbox({
        bbox,
        feature_count      = this.project.getQueryFeatureCount(),
        filterConfig       = {},
        multilayers        = false,
        condition          = this.condition,
        /** @since 3.8.0 **/
        excludeSelected    = null,
        /** @since 3.8.0 **/
        addExternal = true,
        layersFilterObject = { SELECTED_OR_ALL: true, FILTERABLE: true, VISIBLE: true }
      } = {}) {

        const hasExternalLayersSelected = this.hasExternalLayerSelected({ type: "vector" });
        const query = {
          bbox,
          type: 'bbox',
          filterConfig,
          external: {
            add: addExternal,
            filter: {
              SELECTED: hasExternalLayersSelected || (('boolean' == typeof excludeSelected) ? excludeSelected : false)
            }
          },
        };

        // Check If LayerIds is length === 0 so i check if add external Layer is selected
        if (hasExternalLayersSelected) {
          return this.handleRequest(this.getEmptyRequest(), query);
        }

        return this.handleRequest(
          //request
          getQueryLayersPromisesByBBOX(
            // layers
            getMapLayersByFilter( layersFilterObject, condition ),
            //options
            {
              bbox,
              feature_count,
              filterConfig,
              multilayers,
            }
          ),
          // query
          query
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
        const hasExternalLayersSelected = this.hasExternalLayerSelected({ type: "vector" });
        const query = {
          coordinates,
          type: 'coordinates',
          external: {
            add: addExternal,
            filter: {
              SELECTED: hasExternalLayersSelected
            }
          }
        };

        // Return an empty request if an external layer is selected
        if (hasExternalLayersSelected && 0 === layerIds.length) {
          return this.handleRequest(this.getEmptyRequest(), query);
        }

        const layersFilterObject = {
          QUERYABLE: true,
          SELECTED_OR_ALL: (0 === layerIds.length),
          VISIBLE: true
        };


        if (Array.isArray(layerIds)) {
          layerIds.forEach(id => {
            if (!layersFilterObject.IDS) layersFilterObject.IDS = [];
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
              const results = this.handleResponse(response, query);
              resolve(results);
            })
            .fail(reject)
        })
      }

      /**
      *
      * @param response
      * @param query
      * @returns {{result: boolean, data: FlatArray<*[][], 1>[], query: {}, type: string}}
      */
      handleResponse(response = [], query = {}) {
        return {
          query,
          type:   'ows',
          data:   response.map(({ data = [] }) => data).flat(),
          result: true // set result to true
        };

      }

      /**
      * Exception response has user message attribute
      */
      async returnExceptionResponse({ usermessage }) {
        return {
          data:   [],
          usermessage,
          result: true,
          error:  true
        }
      }

    }),

    /**
     * ORIGINAL SOURCE: src/services/data-search.js@v3.9.3
     */
    search: new (class extends BaseService {

      /**
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
        
        let promises                  = [];
        const { layer, ...params }    = options;
        const { raw = false, filter } = options;
        let data                      = [];
        const layers                  = [].concat(layer);         // check if layer is array
        params.filter                 = [].concat(params.filter); // check if filter is array
    
        // if 'api' or 'ows' search_endpoint
        if ('api' === params.search_endpoint) {
          promises = layers.map((layer, i) => layer.searchFeatures({ ...params, filter: params.filter[i] }));
        } else {
          promises = [new Promise((resolve, reject) => {
            layers[0]                                                  // get query provider for get one request only
            .getProvider('search')
            .query({ ...params, layers, ...layers[0].getSearchParams() /* get search params*/ })
            .then(data => { resolve(data)})
            .fail(reject)
          })];
        }
    
        (await Promise.allSettled(promises))
          // filter only fulfilled response
          .filter(d => 'fulfilled' === d.status)
          .forEach(({ value } = {}) => {
            if (raw) {
              data.push({ data: value });
            } else if ('api' !== params.search_endpoint) {
              data = value.data = undefined !== value.data ? value.data : [];
            } else if(Array.isArray(value.data) && value.data.length) {
              data.push(value.data[0]);
            }
          });
    
        return {
          data,
          query: {
            type: 'search',
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
          if (feats) {
            feats.forEach(f => features.push(createOlFeatureFromApiResponseFeature(f)));
          }
        } catch(err) {
          console.warn(err);
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
        } catch(err) {
          console.warn(err);
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
    expression: new (class extends BaseService {

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
          return this.handleResponse(
            // response
            await this.handleRequest({
              url: `${this.project.getUrl('vector_data')}${params.layer_id}/`,
              params
            })
          );
        } catch(err) {
          return Promise.reject(err);
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
      expression_eval(params={}) {
        return this.handleRequest({
          url: this.project.getUrl('expression_eval'),
          params
        });
      }

      /**
       * Handle server request
       * 
       * @param url
       * @param params
       * @param contentType
       * 
       * @returns { Promise<*> }
       */
      handleRequest({ url, params = {}, contentType = 'application/json' } = {}) {
        return XHR.post({ url, contentType, data: JSON.stringify(params) });
      }

      /**
       * Handle server response
       * 
       * @param response
       */
      handleResponse(response = {}) {
        return getFeaturesFromResponseVectorApi(response);
      }
    
    }),

    /**
     * ORIGINAL SOURCE: src/services/data-proxy.js@v3.9.3
     */
    proxy: new (class extends BaseService {
      /**
       *
       * @param data: Object conitans data to pass to proxy
       * @returns {Promise<{data: string, response: *}>}
       */
      async wms({url, method='GET', params={}, headers={}}={}) {
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
        } catch(err) {
          return;
        }
      }

      /**
       * Generic proxy data function
       * @param params
       */
      data(params={}) {}
    }),

    /**
     * ORIGINAL SOURCE: src/services/data-ows.js@v3.9.3
     */
    ows: new (class extends BaseService {
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
          const data = JSON.stringify(params);
          const response = await XHR.post({
            url: owsUrl,
            contentType: 'application/json',
            data
          });
          return response;
        } catch(err) {
          return;
        }
      }
    }),

  };
};

/**
 * ORIGINAL SOURCE: src/app/core/data/service.js@v3.9.3
 */
class BaseService {

  constructor() {
    ProjectsRegistry.onbefore('setCurrentProject', project => this.project = project);
    this.project = ProjectsRegistry.getCurrentProject();
  }
  /**
   * @virtual method need to be implemented by subclasses
   * 
   * @param request is a Promise(jquery promise at moment
   * @returns {Promise<unknown>}
   */
  handleRequest() {}

  /**
   * @virtual method need to be implemented by subclasses
   */
  async handleResponse() {}

  /**
   * @param {{ type: 'vector' }}
   * 
   * @returns { unknown[] } array of external layer add on project
   * 
   * @since 3.8.0
   */
  getSelectedExternalLayers({type = 'vector'}) {
    return GUI.getService('catalog').state.external[type].filter(l => l.selected);
  }

  /**
   * @returns {Promise<[]>} a resolved request (empty array)
   * 
   * @since 3.8.0
   */
  getEmptyRequest() {
    return resolve([]);
  }

  /**
   * @param {{ type: 'vector' }}
   * 
   * @returns {boolean}
   * 
   * @since 3.8.0
   */
  hasExternalLayerSelected({type = 'vector'}) {
    return this.getSelectedExternalLayers({ type }).length > 0;
  }

}

export default DataService;