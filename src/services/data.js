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
import { gettext as _ }                   from 'g3w-i18n';

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
    /** @since 3.8.0 **/
    excludeSelected    = null,
    /** @since 3.8.0 **/
    addExternal = true,
    layersFilterObject = { SELECTED_OR_ALL: true, QUERYABLE: true, VISIBLE: true }
  } = {}) {

    const external = GUI.getService('catalog').state.external.vector.some(l => l.selected);
    const selected = external || (('boolean' == typeof excludeSelected) ? excludeSelected : false);
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
          getMapLayersByFilter(layersFilterObject),
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
          message:     `${layerName} - ${_('mapcontrols.querybypolygon.no_geometry')}`,
          messagetext: true,
          autoclose:   false
        },
        data: geometry ? (await this.getQueryLayersPromisesByGeometry(
          // layers
          getMapLayersByFilter({
            ...(
              "boolean" === typeof excludeSelected
                ? { SELECTED: !excludeSelected }
                : { SELECTED_OR_ALL: true }
            ),
            QUERYABLE: true,
            VISIBLE: true
          }),
          // options
          {
            geometry,
            multilayers,
            feature_count,
            filterConfig,
            projection: ApplicationState.project.getProjection()
          }
        ) || []).flatMap(({ data = [] }) => data) : [],
      };
    } catch (err) {
      console.warn(err);
      throw err;
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
   * @param options.autofilter //@since 3.11.0
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
    autofilter: 0,
    //@since 3.11.0 pagination
    page,
    page_sizes,
  }) {
    const { layer, ...params } = options;
    params.filter              = [].concat(params.filter); // check if filter is an array
    params.page_size           = (params.page_sizes || [])[0]; //get page size
    //@since 3.11.0 count features returned by
    const counts     = [];
    const page_sizes = []; //set pages based on count feature returned by server
    const paginate   = []; //@since v4.0.0 Boolean Array. Store if layer has pagination, mean response count is more that features length returned by server request
    const layers     = []; //@since 4.0.1 need to add layers that has at least one feature to show on query result
    //@since 4.0.1 need to get project layers id order as on TOC. results thake in aoccount this order
    const layersId   = [];
    const traverse = tree => (tree.nodes || [tree]).forEach(n => { if (n.id) { layersId.push(n.id) } else { traverse(n) } });
    ApplicationState.project.state.layerstree.forEach(traverse);
    return {
      data: (await Promise.allSettled(
        ([].concat(layer).sort((a, b) => (layersId.indexOf(a.state.id) > layersId.indexOf(b.state.id) ? 1 : -1))).map((l, i) => l.searchFeatures({ ...params, filter: params.filter[i] }))
      ))
        .filter(d => 'fulfilled' === d.status && (d.value?.data || [])[0].features) //@since 4.0.4 remove check lenght
        .map(({ value } = {}) => {
          //@since 3.11.0 In case autofilter set
          if (1 === params.autofilter) {
            (value.data || [])
              .forEach(({ layer, filtertoken }) => {
                //in the case of filtertoken response attribute set, need to set it to layer
                if (filtertoken) {
                  layer.state.selection.active = layer.state.filter.active = true;
                  layer.setFilterToken(filtertoken); }
              })
          }

          if (params.page_sizes)  {
            //@since 4.0.1 get project layer
            const layer    = (value.data || [])[0].layer;
            //get max number of elements per page
            const max      = Math.max(...(Array.isArray(params.page_sizes)? params.page_sizes : [params.page_sizes]));
            //Check if count (total number of elements of search is more o less than max)
            page_sizes.push(max <= value.count ? params.page_sizes : [...params.page_sizes.filter(p => p < value.count), value.count]);
            //add a count element on counts array
            counts.push(value.count);
            paginate.push(true); //@since 4.0.4 set always true to has results uniform layer tools (selection, filter, save filter)
            layers.push(layer);
          }
          if (params.raw)                                         { return { data: value }; }
          if (Array.isArray(value.data) && value.data.length > 0) { return value.data[0]; }
        }),
      query: {
        type:       'search',
        search:     params.filter, //filter search (array of filter)
        autofilter: !!params.autofilter, //@since 3.11.0 set Boolean
        //@since 3.11.0 pagination
        pagination: params.page_size && {
          pages:         params.page && counts.map(count => Math.ceil(count / params.page_size)), //set number of pages
          current:       params.page && counts.map(() => params.page), //current page
          page_sizes,    //Array contains a number of features that want get with pagination
          current_sizes: counts.map((_, i) => page_sizes[i][0]), // @since 3.11.8 current page size how many features are get
          counts,
          paginate,
          //Object contains info for do another request by another part of code
          getData: {
            //@since 4.0.1 need
            params: params.filter.slice(0, layers.length).map(filter => ({ ...params, filter })),
            method: 'searchFeatures',
            layers: [].concat(layers)
          }
        },
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
      query: { type: 'search', fids },
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

      return response.result ? (response.vector.data.features || []) : Promise.reject(JSON.stringify(response.error));
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
  async 'expression:expression_eval'(params = {}) {
    try {
      const {result, value, error } = await XHR.post({
        url:         `/api/expression_eval/${ApplicationState.project.getId()}/`,
        contentType: 'application/json',
        data:        JSON.stringify(params),
      });
      return result ? value : Promise.reject(JSON.stringify(error));
    } catch(e) {
      console.warn(e);
      return Promise.reject(e);
    }

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
      filterConfig  = {},
      multilayers   = false,
      feature_count = 10
    } = {}
  ) {
    // skip when no features or no geometry
    if (0 === layers.length || !geometry) {
      return [];
    }

    return await handleQueryPromises(Object.values(
      multilayers
        ? groupBy(layers, l => `${l.getMultiLayerId()}_${l.getProjection().getCode()}`)
        : layers
    ).map(layers => {
      const layer = [].concat(layers)[0];
      const filter = {
        config: filterConfig,
        type:   'geometry',
        value:  geometry,
      };
      return promisify(layer.query(
        multilayers
          ? { filter, feature_count, layers }
          : { filter, feature_count, filterConfig }
      ))
    }));
  },

};

