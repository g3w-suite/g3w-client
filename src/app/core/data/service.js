import ProjectsRegistry from 'store/projects';
import GUI from 'services/gui';

const { resolve } = require('utils');

function BaseService(){
  ProjectsRegistry.onbefore('setCurrentProject' , project => this.project = project);
  this.project = ProjectsRegistry.getCurrentProject();
}

const proto = BaseService.prototype;
/**
 *
 * @param request is a Promise(jquery promise at moment
 * @returns {Promise<unknown>}
 */
proto.handleRequest = function(request){
  //  OVERWRITE TO SERVICE
};

proto.handleResponse = async function(response){
  //  OVERWRITE TO SERVICE
};

/**
 * @param {{ type: 'vector' }}
 * 
 * @returns { unknown[] } array of external layer add on project
 * 
 * @since 3.8.0
 */
proto.getSelectedExternalLayers = function({type = 'vector'}) {
  return GUI.getService('catalog').getExternalSelectedLayers({ type });
};

/**
 * @returns {Promise<[]>} a resolved request (empty array)
 * 
 * @since 3.8.0
 */
proto.getEmptyRequest = function(){
  return resolve([]);
};

/**
 * @param {{ type: 'vector' }}
 * 
 * @returns {boolean}
 * 
 * @since 3.8.0
 */
proto.hasExternalLayerSelected = function({type = 'vector'}) {
  return this.getSelectedExternalLayers({ type }).length > 0;
};

module.exports = BaseService;