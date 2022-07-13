import { G3W_FID, QUERY_POINT_TOLERANCE } from 'constant';

const { base, inherit } = require('core/utils/utils');
const { t } = require('core/i18n/i18n.service');
const BaseService = require('core/data/service');
const {
  getQueryLayersPromisesByCoordinates,
  getQueryLayersPromisesByGeometry,
  getQueryLayersPromisesByBBOX,
  getMapLayersByFilter,
} = require('core/utils/geo');

function QueryService() {
  base(this);
  /**
   *
   * @type {{filtrable: {ows: string}}}
   */
  this.condition = {
    filtrable: {
      ows: 'WFS',
    },
  };

  /**
   *
   * @param geometry
   * @param feature_count
   * @param multilayers
   * @param condition
   * @param excludeLayers
   * @returns {Promise<unknown>}
   */
  this.polygon = function ({
    feature, feature_count = this.project.getQueryFeatureCount(), filterConfig = {}, multilayers = false, condition = this.condition, excludeLayers = [],
  } = {}) {
    const polygonLayer = excludeLayers[0];
    const fid = feature.get(G3W_FID);
    const geometry = feature.getGeometry();
    // in case no geometry on polygon layer response
    if (!geometry) {
      return this.returnExceptionResponse({
        usermessage: {
          type: 'warning',
          message: `${polygonLayer.getName()} - ${t('sdk.mapcontrols.querybypolygon.no_geometry')}`,
          messagetext: true,
          autoclose: false,
        },
      });
    }
    const layerFilterObject = {
      SELECTED: false,
      FILTERABLE: true,
      VISIBLE: true,
    };
    const layers = getMapLayersByFilter(layerFilterObject, condition).filter((layer) => excludeLayers.indexOf(layer) === -1);
    const request = getQueryLayersPromisesByGeometry(
      layers,
      {
        geometry,
        multilayers,
        feature_count,
        filterConfig,
        projection: this.project.getProjection(),
      },
    );
    return this.handleRequest(request, {
      fid,
      geometry,
      layer: polygonLayer,
      type: 'polygon',
    });
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
  this.bbox = function ({
    bbox, feature_count = this.project.getQueryFeatureCount(), filterConfig = {}, multilayers = false, condition = this.condition, layersFilterObject = { SELECTEDORALL: true, FILTERABLE: true, VISIBLE: true },
  } = {}) {
    const layers = getMapLayersByFilter(layersFilterObject, condition);
    const request = getQueryLayersPromisesByBBOX(layers, {
      bbox,
      feature_count,
      filterConfig,
      multilayers,
    });
    return this.handleRequest(request, {
      bbox,
      type: 'bbox',
    });
  };

  /**
   *
   * @param map
   * @param coordinates
   * @param multilayers
   * @param feature_count
   * @returns {Promise<unknown>}
   */
  this.coordinates = async function ({
    coordinates, layerIds = [], multilayers = false, query_point_tolerance = QUERY_POINT_TOLERANCE, feature_count,
  } = {}) {
    const layersFilterObject = {
      QUERYABLE: true,
      SELECTEDORALL: layerIds.length === 0,
      VISIBLE: true,
    };
    Array.isArray(layerIds) && layerIds.forEach((layerId) => {
      if (!layersFilterObject.IDS) layersFilterObject.IDS = [];
      layersFilterObject.IDS.push(layerId);
    });
    const layers = getMapLayersByFilter(layersFilterObject);
    const request = getQueryLayersPromisesByCoordinates(layers, {
      multilayers,
      feature_count,
      query_point_tolerance,
      coordinates,
    });
    return this.handleRequest(request, {
      coordinates,
      type: 'coordinates',
    });
  };

  /**
   *
   * @param request is a Promise(jquery promise at moment
   * @returns {Promise<unknown>}
   */
  this.handleRequest = function (request, query = {}) {
    return new Promise((resolve, reject) => {
      request.then((response) => {
        const results = this.handleResponse(response, query);
        resolve(results);
      }).fail(reject);
    });
  };

  /**
   *
   * @param response
   * @returns {Promise<{result: boolean, data: [], query: (*|null)}>}
   */
  this.handleResponse = function (response, query = {}) {
    const layersResults = response;
    const results = {
      query,
      type: 'ows',
      data: [],
      result: true, // set result to true
    };
    layersResults.forEach((result) => result.data && result.data.forEach((data) => results.data.push(data)));
    return results;
  };

  /**
   * Exxception response has user message attribute
   */
  this.returnExceptionResponse = async function ({ usermessage }) {
    return {
      data: [],
      usermessage,
      result: true,
      error: true,
    };
  };
}

inherit(QueryService, BaseService);

module.exports = new QueryService();
