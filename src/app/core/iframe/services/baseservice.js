const {base, inherit, createFilterFormField } = require('core/utils/utils');
const ProjectsRegistry = require('core/project/projectsregistry');
const DataRouterService = require('core/data/routerservice');
const GUI = require('gui/gui');

const G3WObject = require('core/g3wobject');

function BaseIframeService(options={}){
  base(this);
  this.ready = false;
  this.layers;
  this.init = function(){
    //overwrite each service
  }
}

inherit(BaseIframeService, G3WObject);

const proto = BaseIframeService.prototype;

proto.mapService = GUI.getComponent('map').getService();

// sett current roject of all instance
proto.project = ProjectsRegistry.getCurrentProject();

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
  }
  return response;
};


proto.setLayers = function(layers={}){
  this.layers = layers;
};

proto.getLayers = function(){
  return this.layers;
};

proto.setReady = function(bool=false){
  this.ready = bool;
};

proto.getReady = function(){
  return this.ready;
};

module.exports = BaseIframeService;