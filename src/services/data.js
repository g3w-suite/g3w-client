/**
 * @file
 * @since v3.6
 */
import { G3W_FID, QUERY_POINT_TOLERANCE }      from 'app/constant';
import ProjectsRegistry                        from 'store/projects';
import ApplicationService                      from 'services/application';
import GUI                                     from 'services/gui';

import { getQueryLayersPromisesByCoordinates } from 'utils/getQueryLayersPromisesByCoordinates';
import { groupBy }                             from 'utils/groupBy';
import { getMapLayersByFilter }                from 'utils/getMapLayersByFilter';
import { XHR }                                 from 'utils/XHR';
import { promisify }                           from 'utils/promisify';

const { t }  = require('core/i18n/i18n.service');
const Filter = require('core/layers/filter/filter');

export default {

  /**
   * @param { string } contextAndMethod function name (eg. "query:coordinates", "query:bbox", "query:polygon")
   * @param options
   * 
   * @returns {Promise<void>}
   */
  async getData(contextAndMethod, options = {}) {
    const { inputs = {}, outputs = {} } = options;
    const promise = this[contextAndMethod](inputs);
    if (outputs) {
      GUI.outputDataPlace(promise, outputs);
    }
    return await (await promise);
  },

  /**
   * @param {{ coordinates: unknown, layerIds: unknown[], multilayers: boolean, query_point_tolerance: number, feature_count: number }}
   */
  async 'query:coordinates'({
    coordinates,
    layerIds              = [],                   // see: `QueryResultsService::addLayerFeaturesToResultsAction()`
    multilayers           = false,
    query_point_tolerance = QUERY_POINT_TOLERANCE,
    /** @since 3.8.0 **/
    addExternal = true,
    feature_count
  } = {}) {

    const external = GUI.getService('catalog').state.external.vector.some(l => l.selected);
    const layers  = getMapLayersByFilter({
      QUERYABLE:       true,
      SELECTED_OR_ALL: (0 === layerIds.length),
      VISIBLE:         true,
      IDS:             layerIds.length ? layerIds.map(id => id) : undefined,
    });

    try {
      return {
        result: true,
        type: 'ows',
        query: {
          coordinates,
          type: 'coordinates',
          external: {
            add: (!external || layerIds.length > 0)
              ? (1 === layers.length && layers[0].isSelected() ? false : addExternal) // avoid querying a temporary layer (external layer) when another layer is selected
              : addExternal,                                                          // an external layer is selected
            filter: {
              SELECTED: external
            }
          }
        },
        data: ((!external || layerIds.length > 0) && await promisify(getQueryLayersPromisesByCoordinates(layers, {
          multilayers,
          feature_count,
          query_point_tolerance,
          coordinates
        })) || []).flatMap(({ data = [] }) => data),
        
      };
    } catch (error) {
      console.warn(error);
      throw error;
    }

  },

  /**
   * @param bbox
   * @param feature_count
   * @param multilayers
   * @param condition
   * @param filterConfig
   * @param addExternal
   * @param layersFilterObject
   */
  async 'query:bbox'({
    bbox,
    feature_count      = ProjectsRegistry.getCurrentProject().getQueryFeatureCount(),
    filterConfig       = {},
    multilayers        = false,
    condition          = { filtrable: { ows: 'WFS' } },
    /** @since 3.8.0 **/
    addExternal = true,
    layersFilterObject = { SELECTED_OR_ALL: true, FILTERABLE: true, VISIBLE: true }
  } = {}) {

    const external = GUI.getService('catalog').state.external.vector.some(l => l.selected);

    try {
      return {
        result: true,
        type: 'ows',
        query: {
          bbox,
          type: 'bbox',
          filterConfig,
          external: {
            add: addExternal,
            filter: {
              SELECTED: true
            }
          },
        },
        data: (!external && await getQueryLayersPromisesByGeometry(
          // layers
          getMapLayersByFilter(layersFilterObject, condition),
          // options
          {
            geometry: ol.geom.Polygon.fromExtent(bbox),
            feature_count,
            filterConfig,
            multilayers,
            projection: GUI.getService('map').getMap().getView().getProjection(),
          }
        ) || []).flatMap(({ data = [] }) => data),
      };
    } catch (error) {
      console.warn(error);
      throw error;
    }

  },

  /**
   * @param {{ feature: unknown, feature_count: unknown, filterConfig: unknown, multilayers: boolean, condition: boolean, excludeLayers: unknown[] }}
   */
  async 'query:polygon'({
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
    const geometry = feature.getGeometry();

    try {
      return {
        result: true,
        type: 'ows',
        error: !geometry,
        query: {
          fid: GUI.getService('catalog').state.external.vector.some(l => l.selected) ? feature.getId() : feature.get(G3W_FID),
          geometry,
          layerName,
          type,
          filterConfig,
          external
        },
        usermessage: !geometry && {
          type:        'warning',
          message:     `${layerName} - ${t('sdk.mapcontrols.querybypolygon.no_geometry')}`,
          messagetext: true,
          autoclose:   false
        },
        data: (await getQueryLayersPromisesByGeometry(
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
        ) || []).flatMap(({ data = [] }) => data),
      };
    } catch (error) {
      console.warn(error);
      throw error;
    }
  },

  /**
   * Method to search features
   * 
   * @param options.layer
   * @param options.filter
   * @param options.raw
   * @param options.queryUrl
   * @param options.feature_count
   * @param options.formatter
   * @param options.ordering
   * 
   * @returns { Promise<{ data: [], query: { type: 'search', search: * }, type: 'api' | 'ows' }> }
   */
  async 'search:features'(options = {
    layer,
    filter,
    raw: false,
    queryUrl,
    feature_count,
    formatter: 1,
    ordering,
  }) {
    
    /** @deprecated */
    options.search_endpoint = 'api';

    const { layer, ...params } = options;
    const { filter }           = options;
    let data                   = [];
    params.filter              = [].concat(params.filter); // check if filter is array
    
    (await Promise.allSettled(
      [].concat(layer).map((l, i) => l.searchFeatures({ ...params, filter: params.filter[i] }))
    ))
      .filter(d => 'fulfilled' === d.status)
      .forEach(({ value } = {}) => {
        if (options.raw) {
          data.push({ data: value });
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
      type: 'api',
    };
  },

  /**
   * Return feature from api
   * 
   * @param opts.layer
   * @param opts.formatter
   * @param opts.fids
   */
  async 'search:fids'({
    layer,
    formatter = 0,
    fids      = [],
  } = {}) {
    let features = []; 
    try {
      // convert API response to Open Layer Features
      features = ((layer && await layer.getFeatureByFids({ fids, formatter })) || []).map(f => {
        const properties    = undefined !== f.properties ? f.properties : {}
        properties[G3W_FID] = f.id;
        const olFeat          = new ol.Feature(f.geometry && new ol.geom[f.geometry.type](f.geometry.coordinates));
        olFeat.setProperties(properties);
        olFeat.setId(f.id);
        return olFeat;
      });
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
  },

  /**
   * Search service function to load many layers with each one with its fids
   * 
   * @param options.layers    - Array of layers that we want serach fids features
   * @param options.fids      - Array of array of fids
   * @param options.formatter - how we want visualize
   */
  async 'search:layersfids'({
    layers    = [],
    fids      = [],
    formatter = 0,
  } = {}) {
    let data = [];
    try {
      data = (await Promise.all(
        layers.map((layer, i) => this['search:fids']({ layer, fids: fids[i], formatter }))
      )).map(response => response.data);
    } catch(e) {
      console.warn(e);
    }
    return {
      data,
      query: { type: 'search' }
    };
  },

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
   */
  async 'expression:expression'(params= {}) {
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
  },

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
   */
  'expression:expression_eval'(params = {}) {
    return XHR.post({
      url:         ProjectsRegistry.getCurrentProject().getUrl('expression_eval'),
      contentType: 'application/json',
      data:        JSON.stringify(params),
    });
  },

  /**
   * @param data: Object conitans data to pass to proxy
   */
  async 'proxy:wms'({ url, method='GET', params={}, headers={} } = {}) {
    if (method === 'GET') {
      url = new URL(url);
      Object.keys(params).forEach(p => url.searchParams.set(p, params[p]));
      url = url.toString();
    }
    try {
      const data = JSON.stringify({ url, params, headers, method });
      return {
        response: await XHR.post({ data, contentType: 'application/json', url: `${ApplicationService.getProxyUrl()}` }),
        data
      };
    } catch(e) {
      console.warn(e);
    }
  },

  /**
   * Generic proxy data function
   */
  'proxy:data'(params = {}) {},

  /**
   * @param params
   * 
   * @returns {Promise<{data: string, response: *}>}
   */
  async 'ows:wmsCapabilities'({url} ={}) {
    try {
      return await XHR.post({
        url:         `${ApplicationService.getInterfaceOwsUrl()}`,
        contentType: 'application/json',
        data:        JSON.stringify({ url, service: "wms" })
      });
    } catch(e) {
      console.warn(e);
    }
  },

};

/**
 * @param layers
 * @param { Object } opts
 * @param { boolean } opts.multilayers Group query by layers instead single layer request
 * @param opts.bbox
 * @param opts.geometry
 * @param opts.projection
 * @param opts.feature_count
 * 
 * @returns { JQuery.Promise<any, any, any> }
 */
async function getQueryLayersPromisesByGeometry(layers,
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

  // skip when no features
  if (0 === layers.length) {
    return [];
  }

  return await (new Promise((resolve, reject) => {
    Object.values(
      multilayers
      ? groupBy(layers, l => `${l.getMultiLayerId()}_${l.getProjection().getCode()}`)
      : layers
    ).forEach(async (layers, i, arr) => {
      try {
        const layer = multilayers ? layers[0] : layers;
        const crs   = layer.getProjection().getCode();
        // Convert filter geometry from map to layer CRS
        filter.setGeometry(mapCrs === crs ? geometry : geometry.clone().transform(mapCrs, crs));
        queryResponses.push(await promisify(
          multilayers
            ? layer.getProvider('filter').query({ filter, feature_count, layers })
            : layer                      .query({ filter, feature_count, filterConfig })
        ))
      } catch (e) {
        console.warn(e);
        queryErrors.push(e)
      }
      if (i === arr.length - 1) {
        if (queryErrors.length === arr.length) {
          reject(queryErrors);
        } else {
          resolve(queryResponses);
        }
      }
    });
  }));
}