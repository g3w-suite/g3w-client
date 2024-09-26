/**
 * @file
 * @since v3.6
 */
import { G3W_FID, QUERY_POINT_TOLERANCE } from 'g3w-constants';
import ApplicationState                   from 'store/application'
import GUI                                from 'services/gui';

import { groupBy }                        from 'utils/groupBy';
import { getMapLayersByFilter }           from 'utils/getMapLayersByFilter';
import { XHR }                            from 'utils/XHR';
import { $promisify, promisify }          from 'utils/promisify';

const { t }  = require('g3w-i18n');

const handleQueryPromises = async (promises = []) => {
  const responses = await Promise.allSettled(promises);
  // at least one response
  if (responses.some(r => 'fulfilled' === r.status)) {
    return responses.filter(r => 'fulfilled' === r.status).map(r => r.value);
  }
  // show all errors
  return Promise.reject(responses.filter(r => 'rejected' === r.status).map(r => r.reason));
}

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
        data: ((!external || layerIds.length > 0) && await promisify(this.getQueryLayersPromisesByCoordinates(layers, {
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
    feature_count      = ApplicationState.project.state.feature_count || 5,
    filterConfig       = {},
    multilayers        = false,
    condition          = { filtrable: { ows: 'WFS' } },
    /** @since 3.8.0 **/
    excludeSelected    = null,
    /** @since 3.8.0 **/
    addExternal = true,
    layersFilterObject = { SELECTED_OR_ALL: true, FILTERABLE: true, VISIBLE: true }
  } = {}) {

    const external = GUI.getService('catalog').state.external.vector.some(l => l.selected);
    const selected = external || (('boolean' == typeof excludeSelected) ? excludeSelected : false)

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
              SELECTED: selected
            }
          },
        },
        data: (!external && await this.getQueryLayersPromisesByGeometry(
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
    feature_count   = ApplicationState.project.state.feature_count || 5,
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
        data: (await this.getQueryLayersPromisesByGeometry(
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
            projection: ApplicationState.project.getProjection()
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
    const { layer, ...params } = options;
    params.filter              = [].concat(params.filter); // check if filter is array
    
    return {
      data: (await Promise.allSettled(
        [].concat(layer).map((l, i) => l.searchFeatures({ ...params, filter: params.filter[i] }))
      ))
        .filter(d => 'fulfilled' === d.status)
        .map(({ value } = {}) => {
          if (options.raw)                                        { return { data: value }; }
          if (Array.isArray(value.data) && value.data.length > 0) { return value.data[0]; }
        }),
      query: {
        type:   'search',
        search: options.filter,
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
  async 'expression:expression'(params = {}) {
    try {
      const response = await XHR.post({
        url:         `${ApplicationState.project.getUrl('vector_data')}${params.layer_id}/`,
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
      url:         `/api/expression_eval/${ApplicationState.project.getId()}/`,
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
      return {
        response: await XHR.post({
          data:        JSON.stringify({ url, params, headers, method }),
          contentType: 'application/json',
          url:         `${window.initConfig.proxyurl}`
        }),
        data: JSON.stringify({ url, params, headers, method }),
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
        url:         `${window.initConfig.interfaceowsurl}`,
        contentType: 'application/json',
        data:        JSON.stringify({ url, service: "wms" })
      });
    } catch(e) {
      console.warn(e);
    }
  },

  /**
   * used by the following plugins: "archiweb"
   * 
   * @param layers 
   * @param { Object } opts
   * @param opts.coordinates
   * @param opts.feature_count
   * @param opts.query_point_tolerance
   * @param { boolean } opts.multilayers Group query by layers instead single layer request
   * @param opts.reproject
   *  
   * @returns { JQuery.Promise }
   * 
   * @since 3.11.0
   */
  getQueryLayersPromisesByCoordinates(layers, {
    coordinates,
    feature_count         = 10,
    query_point_tolerance = QUERY_POINT_TOLERANCE,
    multilayers           = false,
    reproject             = true,
  } = {}) {
    // skip when no features
    if (0 === layers.length) {
      return $promisify(Promise.resolve(layers));
    }

    const map            = GUI.getService('map').getMap();
    const size           = map.getSize();
    const mapProjection  = map.getView().getProjection();
    const resolution     = map.getView().getResolution();

    return $promisify(async () => await handleQueryPromises(Object.values(
      multilayers
        ? groupBy(layers, l => `${l.getInfoFormat()}:${l.getInfoUrl()}:${l.getMultiLayerId()}`)
        : layers
    ).map(layers => promisify(
      [].concat(layers)[0].query(
        multilayers
          ? { feature_count, coordinates, query_point_tolerance, mapProjection, size, resolution, reproject, layers }
          : { feature_count, coordinates, query_point_tolerance, mapProjection, size, resolution }
        )
      )
    )));

  },

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
   * 
   * @since 3.11.0
   */
  async getQueryLayersPromisesByGeometry(layers,
    {
      geometry,
      projection,
      filterConfig  = {},
      multilayers   = false,
      feature_count = 10
    } = {}
  ) {
    // skip when no features
    if (0 === layers.length) {
      return [];
    }

    const mapCrs = projection.getCode();

    return await handleQueryPromises(Object.values(
      multilayers
        ? groupBy(layers, l => `${l.getMultiLayerId()}_${l.getProjection().getCode()}`)
        : layers
    ).map(layers => {
      const layer = [].concat(layers)[0];
      const crs   = layer.getProjection().getCode();
      const filter = {
        config: filterConfig,
        type:   'geometry',
        // Convert filter geometry from map to layer CRS
        value:  mapCrs === crs ? geometry : geometry.clone().transform(mapCrs, crs),
      };
      return promisify(layer.query(
        multilayers
          ? { filter, feature_count, layers }
          : { filter, feature_count, filterConfig }
      ))
    }));
  },

};

