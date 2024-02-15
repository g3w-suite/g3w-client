/**
 * @file
 * @since v3.6
 */

import { G3W_FID, QUERY_POINT_TOLERANCE } from 'app/constant';
import { BaseService }                    from 'core/data/service';

const { t } = require('core/i18n/i18n.service');

const {
  getQueryLayersPromisesByCoordinates,
  getQueryLayersPromisesByGeometry,
  getQueryLayersPromisesByBBOX,
  getMapLayersByFilter
} = require('utils/geo');

class QueryService extends BaseService {

  constructor() {
    super();

    /**
     * @type {{filtrable: {ows: string}}}
     */
    this.condition = {
      filtrable: {
        ows: 'WFS'
      }
    };
  }


  /**
   * @param {unknown}   opts.feature
   * @param {unknown}   opts.feature_count
   * @param {unknown}   opts.filterConfig
   * @param {boolean}   opts.multilayers
   * @param {boolean}   opts.condition
   * @param {unknown[]} opts.excludeLayers
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
        SELECTED : false,
      },
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
   * @param opts.bbox
   * @param opts.feature_count
   * @param opts.multilayers
   * @param opts.condition
   * @param opts.layersFilterObject
   * 
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
    layersFilterObject = { SELECTED_OR_ALL: true, FILTERABLE: true, VISIBLE: true },
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
   * @param {unknown}   opts.coordinates
   * @param {unknown[]} opts.layerIds              - see: `QueryResultsService::addLayerFeaturesToResultsAction()`
   * @param {boolean}   opts.multilayers
   * @param {number}    opts.query_point_tolerance
   * @param {number}    opts.feature_count
   * 
   * @returns {Promise<unknown>}
   */
  async coordinates({
    coordinates,
    layerIds              = [],
    multilayers           = false,
    query_point_tolerance = QUERY_POINT_TOLERANCE,
    /** @since 3.8.0 **/
    addExternal           = true,
    feature_count,
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
      QUERYABLE:       true,
      SELECTED_OR_ALL: (0 === layerIds.length),
      VISIBLE:         true,
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
      query,
    );

  }

  /**
   * @param request a jQuery Promise
   * 
   * @returns {Promise<unknown>}
   */
  handleRequest(request, query = {}) {
    return new Promise((resolve, reject) => {
      request
        .then(response => { resolve(this.handleResponse(response, query)); })
        .fail(reject);
    })
  }

  /**
   * @param response
   * 
   * @returns {Promise<{result: boolean, data: [], query: (*|null)}>}
   */
  handleResponse(response, query = {}) {
    const results = {
      query,
      type: 'ows',
      data: [],
      result: true // set result to true
    };
    response.forEach(result => result.data && result.data.forEach(data => results.data.push(data)));
    return results;
  }

  /**
   * Exception response has user message attribute
   */
  async returnExceptionResponse({ usermessage }){
    return {
      data: [],
      usermessage,
      result: true,
      error: true
    }
  }

}

export default new QueryService();