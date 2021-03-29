const ProjectsRegistry = require('core/project/projectsregistry');

function BaseService(){
  ProjectsRegistry.onbefore('setCurrentProject' , project => this.project = project);
  this.project = ProjectsRegistry.getCurrentProject();
};

const proto = BaseService.prototype;

proto.handleResponse = function(response){
  //  to overwrite
};

module.exports = BaseService;