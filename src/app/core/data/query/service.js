const {base, inherit} = require('core/utils/utils');
const Filter = require('core/layers/filter/filter');
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
    return new Promise((resolve, reject) =>{
      let queriesPromise;
      const layerFilterObject = {
        ALLNOTSELECTED: true,
        FILTERABLE: true,
        VISIBLE: true
      };
      // multilayers
      const layers = getMapLayersByFilter(layerFilterObject, condition).filter(layer => excludeLayers.indexOf(layer) === -1);
      if (multilayers) {
        queriesPromise = getQueryLayersPromisesByGeometry(layers,
          {
            geometry,
            bbox: false,
            feature_count,
            projection: this.project.getProjection()
          })
      } else {
        const mapCrs = this.project.getProjection().getCode();
        const filter = new Filter();
        const d = $.Deferred();
        queriesPromise = d.promise();
        if (layers.length === 0) d.resolve([]);
        else {
          const queryResponses = [];
          const queryErrors = [];
          let layersLenght = layers.length;
          layers.forEach(layer => {
            const layerCrs = layer.getProjection().getCode();
            filter.setGeometry((mapCrs !== layerCrs) ? geometry.clone().transform(mapCrs, layerCrs): geometry);
            layer.query({
              filter,
              feature_count
            }).then(response => queryResponses.push(response))
              .fail(error => queryErrors.push(error))
              .always(() => {
                layersLenght -= 1;
                if (layersLenght === 0){
                  queryErrors.length === layers.length ? d.reject(queryErrors) : d.resolve(queryResponses)
                }
              })
          });
        }
      }
      queriesPromise.then(response =>{
        const results = this.handleResponse(response);
        resolve(results);
      }).fail(error => reject(error))
    })
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
    return new Promise((resolve, reject) =>{
      const layers = getMapLayersByFilter(layersFilterObject, condition);
      const queriesPromise = getQueryLayersPromisesByBBOX(layers, {
        bbox,
        feature_count,
        multilayers,
      });
      queriesPromise
        .then(response => {
          const results = this.handleResponse(response);
          resolve(results);
        })
        .fail(error=> reject(error))
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
  this.coordinates = function({coordinates, multilayers=false, feature_count}={}){
    return new Promise((resolve, reject) =>{
      const layersFilterObject = {
        QUERYABLE: true,
        SELECTEDORALL: true,
        VISIBLE: true
      };
      const layers = getMapLayersByFilter(layersFilterObject);
      const queryResultsPromise = getQueryLayersPromisesByCoordinates(layers, {
          multilayers,
          feature_count,
          coordinates
        }
      );
      queryResultsPromise
        .then(response => {
          const results = this.handleResponse(response);
          resolve(results);
        })
        .fail(error=>reject(error))
    });

  };
}

inherit(QueryService, BaseService);

module.exports = new QueryService();