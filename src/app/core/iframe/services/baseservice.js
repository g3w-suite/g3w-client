import DataRouterService from 'services/data';
import ProjectsRegistry  from 'store/projects';
import GUI               from 'services/gui';
import G3WObject         from 'core/g3wobject';

const { base, inherit, createFilterFormField } = require('core/utils/utils');

console.assert(undefined !== GUI, 'GUI is undefined');

function BaseIframeService(options={}){
  base(this);
  this.ready = false;
  this.init = function(){
    //overwrite each service
  }
}

inherit(BaseIframeService, G3WObject);

const proto = BaseIframeService.prototype;

/**
 * Common mapService attribute
 */
proto.mapService = GUI.getComponent('map').getService();

/**
 * Common current project attribute
 */
proto.project = ProjectsRegistry.getCurrentProject();

/**
 *
 * @type {null}
 */
proto.layers = undefined;

/**
 * Return a qgs_layer_id array based on passed qgis_layer_id
 * @param qgs_layer_id : String , Array of Strings or null/undefined)
 * @returns Array oa qgs_layer_id strings
 * @private
 */
proto.getQgsLayerId = function({qgs_layer_id, noValue=this.layers.map(layer => layer.id)}){
  return qgs_layer_id ? Array.isArray(qgs_layer_id) ? qgs_layer_id: [qgs_layer_id] : noValue;
};

/**
 * Method to getFeature from DataProvider
 * @private
 */
proto.searchFeature = async function({layer, feature}){
  const search_endpoint = this.project.getSearchEndPoint();
  const {field, value} = feature;
  const { data=[] } = await DataRouterService.getData('search:features', {
    inputs: {
      layer,
      search_endpoint,
      filter: createFilterFormField({
        layer,
        search_endpoint,
        field,
        value
      })
    },
    outputs: false
  });
  return data;
};

/**
 * Comme method to search feature/s by field and value
 * @param qgs_layer_id
 * @param feature
 * @param zoom
 * @param highlight
 * @returns {Promise<{qgs_layer_id: null, features: [], found: boolean}>}
 */
proto.findFeaturesWithGeometry = async function({qgs_layer_id=[], feature, zoom=false, highlight=false}={}){
  const response = {
    found: false,
    features: [],
    qgs_layer_id: null
  };
  let layersCount = qgs_layer_id.length;
  let i = 0;
  while (!response.found && i < layersCount) {
    const layer = this.project.getLayerById(qgs_layer_id[i]);
    try {
      const data = layer && await this.searchFeature({
        layer,
        feature
      });
      if (data.length) {
        const features = data[0].features;
        response.found = features.length > 0 && !!features.find(feature => feature.getGeometry());
        if (response.found) {
          response.features = features;
          response.qgs_layer_id = qgs_layer_id[i];
          zoom && this.mapService.zoomToFeatures(features, {
            highlight
          });
        }
        else i++;
      } else i++;
    } catch(err){i++}
  }
  // in case of no response zoom too initial extent
  !response.found && this.mapService.zoomToProjectInitExtent();

  return response;
};

/**
 * Set layer function
 * @param layers
 */
proto.setLayers = function(layers=[]){
  proto.layers = layers;
};

proto.getLayers = function(){
  return proto.layers;
};

/**
 * Method to set ready the service
 * @param bool
 */
proto.setReady = function(bool=false){
  this.ready = bool;
};

proto.getReady = function(){
  return this.ready;
};

/**
 * Method overwrite single service: Usefult to sto eventually running action
 * * @returns {Promise<void>}
 */
proto.stop = async function(){};

/**
 * Overwrite each single service
 */
proto.clear = function(){
  //overwrite single service
};

export default BaseIframeService;