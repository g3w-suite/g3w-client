import ProjectsRegistry from 'store/projects';

function BaseService(){}

const proto = BaseService.prototype;

/**
 * @returns current Project
 */
proto.getProject = function(){
  return ProjectsRegistry.getCurrentProject();
};

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

module.exports = BaseService;