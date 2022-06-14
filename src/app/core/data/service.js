import ProjectsRegistry from 'core/project/projectsregistry';

class BaseService {
  getProject() {
    return ProjectsRegistry.getCurrentProject();
  }
  /**
   *
   * @param request is a Promise(jquery promise at moment
   * @returns {Promise<unknown>}
   */
  handleRequest(request) {
    console.log(request)
    //  OVERWRITE TO SERVICE
  };

  async handleResponse(response) {
    console.log(response,'baseervice')
    //  OVERWRITE TO SERVICE
  };

}

export default BaseService;