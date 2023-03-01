/**
 * @file
 * @since v3.6
 */

import { G3W_FID, QUERY_POINT_TOLERANCE } from 'app/constant';

const { base, inherit } = require('core/utils/utils');
const { t } = require('core/i18n/i18n.service');
const BaseService = require('core/data/service');
const {
  getQueryLayersPromisesByCoordinates,
  getQueryLayersPromisesByGeometry,
  getQueryLayersPromisesByBBOX,
  getMapLayersByFilter
} = require('core/utils/geo');

function QueryService(){
  base(this);
  /**
   *
   * @type {{filtrable: {ows: string}}}
   */
  this.condition = {
    filtrable: {
      ows: 'WFS'
    }
  };

  /**
   * @param {{ feature: unknown, feature_count: unknown, filterConfig: unknown, multilayers: boolean, condition: boolean, excludeLayers: unknown[] }}
   * 
   * @returns {Promise<unknown>}
   */
  this.polygon = function({
    feature,
    feature_count   = this.project.getQueryFeatureCount(),
    filterConfig    = {},
    multilayers     = false,
    condition       = this.condition,
    /** @since v3.8 */
    layer           = null,
    /** @since v3.8 */
    excludeSelected = null
  } = {}) {
    const hasExternalLayersSelected = this.hasExternalLayerSelected({ type: "vector" });
    const fid                       = (hasExternalLayersSelected) ? feature.getId() : feature.get(G3W_FID);
    const geometry                  = feature.getGeometry();

    if (hasExternalLayersSelected) {
      layer.getName = () => layer.get('name');
    }

    // in case no geometry on polygon layer response
    if (!geometry) {
      return this.returnExceptionResponse({
        usermessage: {
          type: 'warning',
          message: `${layer.getName()} - ${t('sdk.mapcontrols.querybypolygon.no_geometry')}`,
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
          SELECTED: !excludeSelected,
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
        layer,
        type: 'polygon',
        filterConfig,
        external: {
          add: true,
          filter: {
            SELECTED: ('boolean' == typeof excludeSelected) ? !excludeSelected : excludeSelected
          }
        }
      }
    );
  };

  /**
   *
   * @param bbox
   * @param feature_count
   * @param multilayers
   * @param condition
   * @param layersFilterObject
   * @returns {Promise<unknown>}
   */
  this.bbox = function({
    bbox,
    feature_count      = this.project.getQueryFeatureCount(),
    filterConfig       = {},
    multilayers        = false,
    condition          = this.condition,
    layersFilterObject = { SELECTEDORALL: true, FILTERABLE: true, VISIBLE: true }
  } = {}) {

    const hasExternalLayersSelected = this.hasExternalLayerSelected({ type: "vector" });
    const query = {
      bbox,
      type: 'bbox',
      filterConfig,
      external: {
        add: true,
        filter: {
          SELECTED: hasExternalLayersSelected
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

  };

  /**
   *
   * @param {{ coordinates: unknown, layerIds: unknown[], multilayers: boolean, query_point_tolerance: number, feature_count: number }}
   * @param layerIds: <Array>
   * @param multilayers
   * @param feature_count
   * 
   * @returns {Promise<unknown>}
   */
  this.coordinates = async function({
    coordinates,
    layerIds              = [],                   // see: `QueryResultsService::addLayerFeaturesToResultsAction()`
    multilayers           = false,
    query_point_tolerance = QUERY_POINT_TOLERANCE,
    feature_count
  } = {}) {
    const hasExternalLayersSelected = this.hasExternalLayerSelected({ type: "vector" });
    const query = {
      coordinates,
      type: 'coordinates',
      external: {
        add: true,
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
      SELECTEDORALL: (0 === layerIds.length),
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

  };

  /**
   *
   * @param request is a Promise(jquery promise at moment
   * @returns {Promise<unknown>}
   */
  this.handleRequest = function(request, query={}){
    return new Promise((resolve, reject) =>{
      request.then(response => {
        const results = this.handleResponse(response, query);
        resolve(results);
      }).fail(reject)
    })
  };

  /**
   *
   * @param response
   * @returns {Promise<{result: boolean, data: [], query: (*|null)}>}
   */
  this.handleResponse = function(response, query={}){
    const layersResults = response;
    const results = {
      query,
      type: 'ows',
      data: [],
      result: true // set result to true
    };
    layersResults.forEach(result => result.data && result.data.forEach(data => results.data.push(data)));
    return results;
  };

  /**
   * Exception response has user message attribute
   */
  this.returnExceptionResponse = async function({usermessage}){
    return {
      data: [],
      usermessage,
      result: true,
      error: true
    }
  };
}

inherit(QueryService, BaseService);

export default new QueryService();