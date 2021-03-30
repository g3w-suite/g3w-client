import ApplicationState from '../../applicationstate';
const {base, inherit} = require('core/utils/utils');
const Filter = require('core/layers/filter/filter');
const BaseService = require('../service');

const {
  getQueryLayersPromisesByCoordinates,
  getQueryLayersPromisesByGeometry,
  getMapLayersByFilter} = require('core/utils/geo');

function QueryService(){
  base(this);
  this.condition = {
    filtrable: {ows: 'WFS'}
  };

  //query By Polygon
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
        const mapCrs = ApplicationState.map.epsg;
        const filter = new Filter();
        const d = $.Deferred();
        queriesPromise = d.promise();
        if (layers.length === 0) d.resolve([]);
        else {
          const queryResponses = [];
          let layersLenght = layers.length;
          layers.forEach(layer => {
            const layerCrs = layer.getProjection().getCode();
            filter.setGeometry((mapCrs !== layerCrs) ? geometry.clone().transform(mapCrs, layerCrs): geometry);
            layer.query({
              filter,
              feature_count
            }).then(response => queryResponses.push(response))
              .always(() => {
                layersLenght -= 1;
                layersLenght === 0 && d.resolve(queryResponses)
              })
          });
        }
      }
      queriesPromise.then(response =>{
        const results = this.handleResponse(response);
        resolve(results);
      }).fail(reject)
    })
  };

  //query by bbox
  this.bbox = function({ bbox,feature_count=this.project.getQueryFeatureCount(), multilayers=false, condition=this.condition, layersFilterObject = {SELECTEDORALL: true, FILTERABLE: true, VISIBLE: true}}={}) {
    return new Promise((resolve, reject) =>{
      const layers = getMapLayersByFilter(layersFilterObject, condition);
      let queriesPromise;
      if (multilayers) {
        const layers = getMapLayersByFilter(layersFilterObject, condition);
        queriesPromise = getQueryLayersPromisesByGeometry(layers, {
          geometry: bbox,
          bbox: true,
          feature_count,
          projection: this.project.getProjection()
        })
      } else {
        const d = $.Deferred();
        queriesPromise = d.promise();
        const queryResponses = [];
        let layersLenght = layers.length;
        let filterBBox = bbox;
        layers.forEach(layer => {
          const filter = new Filter();
          filter.setBBOX(filterBBox);
          layer.query({
            filter,
            feature_count
          }).then(response => {
            queryResponses.push(response)
          }).always(() => {
            layersLenght -= 1;
            if (layersLenght === 0)
              d.resolve(queryResponses)
          })
        });
      }
      queriesPromise
        .then(response => {
          const results = this.handleResponse(response);
          resolve(results);
        })
        .fail(reject)
    });

  };

  // query by coordinates
  this.coordinates = function({map, coordinates, multilayers=false, feature_count}={}){
    return new Promise((resolve, reject) =>{
      const layersFilterObject = {
        QUERYABLE: true,
        SELECTEDORALL: true,
        VISIBLE: true
      };
      const layers = getMapLayersByFilter(layersFilterObject);
      const queryResultsPromise = getQueryLayersPromisesByCoordinates(layers, {
          map,
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
        .fail(reject)
    });

  };
}

inherit(QueryService, BaseService);

module.exports = new QueryService();