const ProjectsRegistry = require('core/project/projectsregistry');

function BaseService(){
  ProjectsRegistry.onbefore('setCurrentProject' , project => this.project = project);
  this.project = ProjectsRegistry.getCurrentProject();
};

const proto = BaseService.prototype;

proto.handleResponse = function(response){
  const layersResults = response;
  const results = {
    query: layersResults[0] ? layersResults[0].query: null,
    data: []
  };
  layersResults.forEach(result => result.data && result.data.forEach(data => {results.data.push(data)}));
  return results;
};

module.exports = BaseService;