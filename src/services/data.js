/**
 * @file
 * @since v3.6
 */
import { G3W_FID, QUERY_POINT_TOLERANCE } from 'g3w-constants';
import ApplicationState                   from 'g3w-state'
import GUI                                from 'services/gui';

import { groupBy }                        from 'utils/groupBy';
import { gettext as _ }                   from 'g3w-i18n';

export default {

  /**
   * @param { string } func function name (eg. "query:coordinates", "query:bbox", "query:polygon")
   * @param options
   * 
   * @returns {Promise<void>}
   */
  async getData(func, options = {}) {
    const { inputs = {}, outputs = {} } = options;
    const promise = this[func](inputs);
    if (outputs) {
      GUI.showData(promise, outputs);
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
    feature_count = 10
  } = {}) {
    try {
      let data       = [];
      const external = GUI.getService('catalog').state.external.vector.some(l => l.selected);
      const layers   = Object.values(ApplicationState.layers)
        .flatMap(s => s.isQueryable() ? s.getLayers({
          GEOLAYER:        true,
          QUERYABLE:       true,
          SELECTED_OR_ALL: (0 === layerIds.length),
          VISIBLE:         true,
          IDS:             layerIds.length ? layerIds.map(id => id) : undefined,
        }) : []);

      if ((!external || layerIds.length > 0) && layers.length) {
        const size           = GUI.getMap().getSize();
        const mapProjection  = GUI.getMap().getView().getProjection();
        const resolution     = GUI.getMap().getView().getResolution();
        // group query by multilayerid
        const responses = await Promise.allSettled(Object.values(
          multilayers
            ? groupBy(layers, l => `${l.getInfoFormat()}:${l.getInfoUrl()}:${l.getMultiLayerId()}`)
            : layers
        ).map(layers => 
          [].concat(layers)[0].query(
            multilayers
              ? { feature_count, coordinates, query_point_tolerance, mapProjection, size, resolution, reproject: true, layers }
              : { feature_count, coordinates, query_point_tolerance, mapProjection, size, resolution }
            )
          )
        );
        // show all errors
        if (responses.some(r => 'rejected' === r.status)) {
          throw responses.filter(r => 'rejected' === r.status).map(r => r.reason);
        }
        // at least one response
        data = responses.filter(r => 'fulfilled' === r.status).map(r => r.value);
      }
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
        data: data.flatMap(({ data = [] }) => data),
        
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
    try {
      let data       = [];
      const external = GUI.getService('catalog').state.external.vector.some(l => l.selected);
      const selected = external || (('boolean' == typeof excludeSelected) ? excludeSelected : false);
      const layers   = Object.values(ApplicationState.layers)
        .flatMap(s => s.isQueryable() ? s.getLayers({ GEOLAYER: true, ...(layersFilterObject || {}) }) : []);

      if (!external && layers.length) {
        const geometry   = ol.geom.Polygon.fromExtent(bbox);
        const projection = GUI.getMap().getView().getProjection();

        const responses = await Promise.allSettled(Object.values(
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
            value:  projection.getCode() === crs ? geometry : geometry.clone().transform(projection.getCode(), crs),
          };
          return layer.query(
            multilayers
              ? { filter, feature_count, layers }
              : { filter, feature_count, filterConfig }
          )
        }));
        // show all errors
        if (responses.some(r => 'rejected' === r.status)) {
          throw responses.filter(r => 'rejected' === r.status).map(r => r.reason);
        }
        // at least one response
        data = responses.filter(r => 'fulfilled' === r.status).map(r => r.value);
      }
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
        data: data.flatMap(({ data = [] }) => data),
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
    try {
      let data       = [];
      const geometry = feature.getGeometry();
      const layers   = Object.values(ApplicationState.layers)
        .flatMap(s => s.isQueryable() ? s.getLayers({
          GEOLAYER: true,
          ...( "boolean" === typeof excludeSelected ? { SELECTED: !excludeSelected } : { SELECTED_OR_ALL: true } ),
          QUERYABLE: true,
          VISIBLE: true
        }) : []);

        if (layers.length) {
          const projection = ApplicationState.project.getProjection();

          const responses = await Promise.allSettled(Object.values(
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
              value:  projection.getCode() === crs ? geometry : geometry.clone().transform(projection.getCode(), crs),
            };
            return layer.query(
              multilayers
                ? { filter, feature_count, layers }
                : { filter, feature_count, filterConfig }
            )
          }));
          // show all errors
          if (responses.some(r => 'fulfilled' === r.status)) {
            throw responses.filter(r => 'rejected' === r.status).map(r => r.reason);
          }
          // at least one response
          data = responses.filter(r => 'fulfilled' === r.status).map(r => r.value);
        }

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
        data: data.flatMap(({ data = [] }) => data),
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
    const paginate   = []; //@since v4.0.0 set if is paginate, mean ctat data i more tna count
    return {
      data: (await Promise.allSettled(
        [].concat(layer).map((l, i) => l.getFilterData({ ...params, field: params.filter[i] }))
      ))
        .filter(d => 'fulfilled' === d.status)
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
            const features = (value.data || [])[0].features;
            //get max number of elements per page
            const max = Math.max(...(Array.isArray(params.page_sizes)? params.page_sizes : [params.page_sizes]));
            //Check if count (total number of elements of search is more o less than max)
            page_sizes.push(max <= value.count ? params.page_sizes : [...params.page_sizes.filter(p => p < value.count), value.count]);
            //add a count element on counts array
            counts.push(value.count);
            paginate.push(features && value.count > features.length);
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
            params: params.filter.map(filter => ({ ...params, filter })),
            method: 'getFilterData',
            layers: [].concat(layer)
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

};

