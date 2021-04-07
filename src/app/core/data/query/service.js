const {base, inherit} = require('core/utils/utils');
const BaseService = require('core/data/service');

const {
  getQueryLayersPromisesByCoordinates,
  getQueryLayersPromisesByGeometry,
  getQueryLayersPromisesByBBOX,
  getMapLayersByFilter} = require('core/utils/geo');

function QueryService(){
  base(this);
  /**
   *
   * @type {{filtrable: {ows: string}}}
   */
  this.condition = {
    filtrable: {ows: 'WFS'}
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
  this.polygon = function({geometry, feature_count=this.project.getQueryFeatureCount(), multilayers=false, condition=this.condition, excludeLayers=[]}={}) {
    const layerFilterObject = {
      ALLNOTSELECTED: true,
      FILTERABLE: true,
      VISIBLE: true
    };
    const layers = getMapLayersByFilter(layerFilterObject, condition).filter(layer => excludeLayers.indexOf(layer) === -1);
    const request = getQueryLayersPromisesByGeometry(layers,
      {
        geometry,
        multilayers,
        bbox: false,
        feature_count,
        projection: this.project.getProjection()
      });
      return this.handleRequest(request);
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
  this.bbox = function({ bbox, feature_count=this.project.getQueryFeatureCount(), multilayers=false, condition=this.condition, layersFilterObject = {SELECTEDORALL: true, FILTERABLE: true, VISIBLE: true}}={}) {
    const layers = getMapLayersByFilter(layersFilterObject, condition);
    const request = getQueryLayersPromisesByBBOX(layers, {
      bbox,
      feature_count,
      multilayers,
    });
    return this.handleRequest(request);
  };

  /**
   *
   * @param map
   * @param coordinates
   * @param multilayers
   * @param feature_count
   * @returns {Promise<unknown>}
   */
  this.coordinates = async function({coordinates, multilayers=false, feature_count}={}){
    const layersFilterObject = {
      QUERYABLE: true,
      SELECTEDORALL: true,
      VISIBLE: true
    };
    const layers = getMapLayersByFilter(layersFilterObject);
    const request = getQueryLayersPromisesByCoordinates(layers, {
      multilayers,
        feature_count,
        coordinates
    });
    return this.handleRequest(request);
  };

  /**
   *
   * @param request is a Promise(jquery promise at moment
   * @returns {Promise<unknown>}
   */
  this.handleRequest = function(request){
    return new Promise((resolve, reject) =>{
      request.then(response => {
        const results = this.handleResponse(response);
        resolve(results);
      }).fail(error=>reject(error))
    })
  };

  /**
   *
   * @param response
   * @returns {Promise<{result: boolean, data: [], query: (*|null)}>}
   */
  this.handleResponse = async function(response){
    const layersResults = response;
    const results = {
      query: layersResults[0] ? layersResults[0].query: null,
      data: [],
      result: true // set result to true
    };
    layersResults.forEach(result => result.data && result.data.forEach(data => {results.data.push(data)}));
    return results;
  };
}

inherit(QueryService, BaseService);

module.exports = new QueryService();