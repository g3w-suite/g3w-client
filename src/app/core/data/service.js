import ProjectsRegistry from 'store/projects';

function BaseService(){
  
  /** @deprecated since v3.5 */
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