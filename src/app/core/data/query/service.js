import { G3W_FID, QUERY_POINT_TOLERANCE } from 'constant';
import geoutils from 'core/utils/geo';
import BaseService from 'core/data/service';
import { t } from 'core/i18n/i18n.service';

class QueryService extends BaseService {
  constructor() {
    super();
    /**
     *
     * @type {{filtrable: {ows: string}}}
     */
    this.condition = {
      filtrable: {
        ows: 'WFS',
      },
    };
  }

  /**
   *
   * @param geometry
   * @param feature_count
   * @param multilayers
   * @param condition
   * @param excludeLayers
   * @returns {Promise<unknown>}
   */
  polygon({
    feature, feature_count = this.getProject().getQueryFeatureCount(), filterConfig = {}, multilayers = false, condition = this.condition, excludeLayers = [],
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
    const layers = geoutils.getMapLayersByFilter(layerFilterObject, condition).filter((layer) => excludeLayers.indexOf(layer) === -1);
    const request = geoutils.getQueryLayersPromisesByGeometry(
      layers,
      {
        geometry,
        multilayers,
        feature_count,
        filterConfig,
        projection: this.getProject().getProjection(),
      },
    );
    return this.handleRequest(request, {
      fid,
      geometry,
      layer: polygonLayer,
      type: 'polygon',
    });
  }

  /**
   *
   * @param bbox
   * @param feature_count
   * @param multilayers
   * @param condition
   * @param layersFilterObject
   * @returns {Promise<unknown>}
   */
  bbox({
    bbox, feature_count = this.getProject().getQueryFeatureCount(), filterConfig = {}, multilayers = false, condition = this.condition, layersFilterObject = { SELECTEDORALL: true, FILTERABLE: true, VISIBLE: true },
  } = {}) {
    const layers = geoutils.getMapLayersByFilter(layersFilterObject, condition);
    const request = geoutils.getQueryLayersPromisesByBBOX(layers, {
      bbox,
      feature_count,
      filterConfig,
      multilayers,
    });
    return this.handleRequest(request, {
      bbox,
      type: 'bbox',
    });
  }

  /**
   *
   * @param map
   * @param coordinates
   * @param multilayers
   * @param feature_count
   * @returns {Promise<unknown>}
   */
  async coordinates({
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
    const layers = geoutils.getMapLayersByFilter(layersFilterObject);
    const request = geoutils.getQueryLayersPromisesByCoordinates(layers, {
      multilayers,
      feature_count,
      query_point_tolerance,
      coordinates,
    });
    return this.handleRequest(request, {
      coordinates,
      type: 'coordinates',
    });
  }

  /**
   *
   * @param request is a Promise(jquery promise at moment
   * @returns {Promise<unknown>}
   */
  async handleRequest(request, query = {}) {
    try {
      const response = await request;
      return this.handleResponse(response, query);
    } catch (err) {
      throw err;
    }
  }

  /**
   *
   * @param response
   * @returns {Promise<{result: boolean, data: [], query: (*|null)}>}
   */
  handleResponse(response, query = {}) {
    const layersResults = response;
    const results = {
      query,
      type: 'ows',
      data: [],
      result: true, // set result to true
    };
    layersResults.forEach((result) => result.data && result.data.forEach((data) => results.data.push(data)));
    return results;
  }

  /**
   * Exception response has user message attribute
   */
  async returnExceptionResponse({ usermessage }) {
    return {
      data: [],
      usermessage,
      result: true,
      error: true,
    };
  }

  ciao() {
    console.log('sono io');
  }
}

export default new QueryService();
