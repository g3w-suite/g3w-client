import DataRouterService from 'services/data';
import ProjectsRegistry  from 'store/projects';
import GUI               from 'services/gui';

const {
  base,
  inherit,
  createFilterFormField
}                        = require('utils');
const G3WObject          = require('core/g3wobject');

function BaseIframeService(options={}) {

  base(this);

  /**
   * @type { boolean }
   */
  this.ready = false;

  /**
   * Map service
   */
  this.mapService = GUI.getService('map');

  /**
   * Current project
   */
  this.project = ProjectsRegistry.getCurrentProject();

  /**
   * @type { Array | undefined }
   */
  this.layers = undefined;

  this.init = function() {
    // overwrite each service
  };

}

inherit(BaseIframeService, G3WObject);

const proto = BaseIframeService.prototype;

/**
 * Return a qgs_layer_id array based on passed qgis_layer_id
 * 
 * @param { Object } opts
 * @param { string | string[] | null | undefined } opts.qgs_layer_id
 * @param { Array } noValue
 * 
 * @returns { string[] } qgs_layer_id
 * 
 * @private
 */
proto.getQgsLayerId = function({
  qgs_layer_id,
  noValue = this.layers.map(layer => layer.id)
}) {
  return qgs_layer_id ?
    (
      Array.isArray(qgs_layer_id) ?
      qgs_layer_id :
      [qgs_layer_id]
    ) :
    noValue;
};

/**
 * getFeature from DataProvider
 * 
 * @private
 */
proto.searchFeature = async function({layer, feature}) {
  const search_endpoint  = this.project.getSearchEndPoint();
  const { field, value } = feature;
  const { data = [] }    = await DataRouterService.getData('search:features', {
    inputs: {
      layer,
      search_endpoint,
      filter: createFilterFormField({ layer, search_endpoint, field, value })
    },
    outputs: false
  });
  return data;
};

/**
 * Search feature(s) by field and value
 * 
 * @param { Object } opts
 * @param opts.qgs_layer_id
 * @param opts.feature
 * @param opts.zoom
 * @param opts.highlight
 * 
 * @returns { Promise<{ qgs_layer_id: null, features: [], found: boolean }>}
 */
proto.findFeaturesWithGeometry = async function({
  feature,
  qgs_layer_id = [],
  zoom         = false,
  highlight    = false,
}={}) {
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
      const data = layer && await this.searchFeature({ layer, feature });
      if (data.length) {
        const features = data[0].features;
        response.found = features.length > 0 && !!features.find(feature => feature.getGeometry());
        if (response.found) {
          response.features = features;
          response.qgs_layer_id = qgs_layer_id[i];
          zoom && this.mapService.zoomToFeatures(features, {
            highlight
          });
        } else {
          i++;
        }
      } else {
        i++;
      }
    } catch(err) {
      i++;
    }
  }
  // in case of no response zoom too initial extent
  if (!response.found) {
    this.mapService.zoomToProjectInitExtent();
  }
  return response;
};

/**
 * Set layer function
 * 
 * @param layers
 */
proto.setLayers = function(layers=[]) {
  proto.layers = layers;
};

proto.getLayers = function() {
  return proto.layers;
};

/**
 * Set ready service
 * 
 * @param bool
 */
proto.setReady = function(bool=false) {
  this.ready = bool;
};

proto.getReady = function() {
  return this.ready;
};

/**
 * Overwrite single service: Usefult to stop eventually running action
 * 
 * @virtual method need to be implemented by subclasses
 * 
 * @returns { Promise<void> }
 */
proto.stop = async function() {};

/**
 * Overwrite each single service
 * 
 * @virtual method need to be implemented by subclasses
 */
proto.clear = function() {};

module.exports = BaseIframeService;