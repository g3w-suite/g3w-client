import ProjectsRegistry from 'core/project/projectsregistry';

class BaseService {
  constructor() {
    ProjectsRegistry.onbefore('setCurrentProject' , project => this.project = project);
    this.project = ProjectsRegistry.getCurrentProject();
  }
  /**
   *
   * @param request is a Promise(jquery promise at moment
   * @returns {Promise<unknown>}
   */
  handleRequest(request) {
    //  OVERWRITE TO SERVICE
  };

  handleResponse = async function(response) {
    //  OVERWRITE TO SERVICE
  };
}

export default  BaseService;