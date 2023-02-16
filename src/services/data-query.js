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
   * @type {{ filtrable: { ows: string } }}
   */
  this.condition = {
    filtrable: {
      ows: 'WFS'
    }
  };

  /**
   * @param geometry
   * @param feature_count
   * @param multilayers
   * @param condition
   * @param excludeLayers
   * 
   * @returns {Promise<unknown>}
   */
  this.polygon = function({
    feature,
    feature_count     = this.project.getQueryFeatureCount(),
    filterConfig      = {},
    multilayers       = false,
    condition         = this.condition,
    layerFilterObject = { SELECTED: false, FILTERABLE: true, VISIBLE: true },
    excludeLayers = [],
  } = {}) {

    /**
     * @FIXME unclear documentation
     */
    // In case of Polygon coming from feature of Layer. If a draw feature excludeLayers is empty Array
    // case QueryByDrawPolygon map control
    const polygonLayer = (excludeLayers.length)
      ? excludeLayers[0]
      : null;

    const geometry = feature.getGeometry();

    if (geometry) {
      return this.handleRequest(
        // request
        getQueryLayersPromisesByGeometry(
          // layers
          getMapLayersByFilter(
            layerFilterObject,
            condition
          ).filter(layer => -1 === excludeLayers.indexOf(layer)),
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
          fid: feature.get(G3W_FID),
          geometry,
          layer: polygonLayer,
          type: 'polygon'
        }
      );
    }

    // no geometry on polygon layer response (warning message)
    return this.returnExceptionResponse({
      usermessage: {
        type: 'warning',
        message: `${polygonLayer.getName()} - ${t('sdk.mapcontrols.querybypolygon.no_geometry')}`,
        messagetext: true,
        autoclose: false
      }
    });
  };

  /**
   * @param bbox
   * @param feature_count
   * @param multilayers
   * @param condition
   * @param layersFilterObject
   * 
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
    return this.handleRequest(
      // request
      getQueryLayersPromisesByBBOX(
        //layers
        getMapLayersByFilter(layersFilterObject, condition),
        {
          bbox,
          feature_count,
          filterConfig,
          multilayers,
        }
      ),
      {
        bbox,
        type: 'bbox',
      }
    );
  };

  /**
   * @param map
   * @param coordinates
   * @param multilayers
   * @param feature_count
   * 
   * @returns {Promise<unknown>}
   */
  this.coordinates = async function({
    coordinates,
    layerIds             = [],
    multilayers          = false,
    query_point_tolerance = QUERY_POINT_TOLERANCE,
    feature_count
  } = {}) {
    const layersFilterObject =  {
      QUERYABLE: true,
      SELECTEDORALL: layerIds.length === 0,
      VISIBLE: true
    };

    if (Array.isArray(layerIds)) {
      layerIds.forEach(layerId => {
        if (!layersFilterObject.IDS) {
          layersFilterObject.IDS = [];
        }
        layersFilterObject.IDS.push(layerId);
      });
    }
     
    return this.handleRequest(
      // request
      getQueryLayersPromisesByCoordinates(
        // layers
        getMapLayersByFilter(layersFilterObject),
        {
          multilayers,
          feature_count,
          query_point_tolerance,
          coordinates
        }
      ),
      {
        coordinates,
        type: 'coordinates',
      }
    );
  };

  /**
   * @param request a jQuery promise
   * 
   * @returns {Promise<unknown>}
   */
  this.handleRequest = function(request, query={}){
    return new Promise((resolve, reject) => {
      request
        .then(response => { resolve(this.handleResponse(response, query)); })
        .fail(reject)
    });
  };

  /**
   *
   * @param response results layer
   * 
   * @returns {{query: *, type: string, data: any[], result: true }}
   */
  this.handleResponse = function(response, query={}) {
    const data = [];
    response.forEach(res => res.data && res.data.forEach(d => data.push(d)));
    return {
      query,
      type: 'ows',
      data,
      result: true // set result to true
    };
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
    };
  }
}

inherit(QueryService, BaseService);

export default new QueryService();