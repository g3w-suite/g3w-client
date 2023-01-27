import ProjectsRegistry from 'store/projects';
import GUI from 'services/gui';
const {
  resolve
} = require('core/utils/utils');

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
 * @since v3.8
 */

/**
 *
 * @param type
 * @returns Array of external layer add on project
 */
proto.getSelectedExternalLayers = function({type="vector"}){
  return GUI.getService('catalog').getExternalSelectedLayers({
    type
  });
};

/**
 * Return empty request
 */
proto.getEmptyRequest = function(){
  return resolve([]);
};

module.exports = BaseService;