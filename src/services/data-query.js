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
    feature_count  = this.project.getQueryFeatureCount(),
    filterConfig   = {},
    multilayers    = false,
    condition      = this.condition,
    excludeLayers  = []
  } = {}) {
    const hasExternalLayers = this.getSelectedExternalLayers({ type: "vector" }).length;
    const fid               = (hasExternalLayers) ? feature.getId() : feature.get(G3W_FID);
    let polygonLayer        = (hasExternalLayers) ? ({ getName() { return excludeLayers[0].get('name'); } }) : excludeLayers[0];

    const geometry = feature.getGeometry();

    // in case no geometry on polygon layer response
    if (!geometry) {
      return this.returnExceptionResponse({
        usermessage: {
          type: 'warning',
          message: `${polygonLayer.getName()} - ${t('sdk.mapcontrols.querybypolygon.no_geometry')}`,
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
          SELECTED: false,
          FILTERABLE: true,
          VISIBLE: true
        }, condition).filter(layer => excludeLayers.indexOf(layer) === -1),
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
        layer: polygonLayer,
        type: 'polygon',
        filterConfig
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
  this.bbox = function({ bbox, feature_count=this.project.getQueryFeatureCount(), filterConfig={}, multilayers=false, condition=this.condition, layersFilterObject = {SELECTEDORALL: true, FILTERABLE: true, VISIBLE: true}}={}) {
    const query = {
      bbox,
      type: 'bbox',
      filterConfig
    };
    const externalSelectedLayers = this.getSelectedExternalLayers({
      type: "vector"
    });
    /**
     * Check If LayerIds is length === 0 so i check if add external Layer is selected
     */
    if ( externalSelectedLayers.length) {
      return this.handleRequest(this.getEmptyRequest(), query);
    } else {
      const layers = getMapLayersByFilter(layersFilterObject, condition);
      const request = getQueryLayersPromisesByBBOX(layers, {
        bbox,
        feature_count,
        filterConfig,
        multilayers,
      });
      return this.handleRequest(request, query);
    }
  };
  /**
   *
   * @param {{ coordinates: unknown, layerIds: unknown[], multilayers: boolean, query_point_tolerance: number, feature_count: number }}
   * @param 
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
    const externalSelectedLayers = this.getSelectedExternalLayers({ type: 'vector' });
    const query                  = { coordinates, type: 'coordinates' };

    // Return an empty request if an external layer is selected
    if (externalSelectedLayers.length && 0 === layerIds.length) {
      return this.handleRequest(this.getEmptyRequest(), query);
    }

    const layersFilterObject =  {
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

    return this.handleRequest(
      // request
      getQueryLayersPromisesByCoordinates(
        // layers
        getMapLayersByFilter(layersFilterObject),
        // options
        {
          multilayers,
          feature_count,
          query_point_tolerance,
          coordinates
        }
      ),
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
  }
}

inherit(QueryService, BaseService);

export default new QueryService();