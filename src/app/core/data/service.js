const ProjectsRegistry = require('core/project/projectsregistry');

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

module.exports = BaseService;