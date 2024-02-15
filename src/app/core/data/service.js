import ProjectsRegistry from 'store/projects';
import GUI              from 'services/gui';

const { resolve } = require('utils');

export class BaseService {

  constructor() {
    ProjectsRegistry.onbefore('setCurrentProject' , project => this.project = project);
    this.project = ProjectsRegistry.getCurrentProject();
  }

  /**
   * @param request a jQuery Promise
   * 
   * @returns {Promise<unknown>}
   */
  handleRequest(request) {
    //  OVERWRITE TO SERVICE
  };

  async handleResponse(response) {
    //  OVERWRITE TO SERVICE
  }

  /**
   * @param {{ type: 'vector' }}
   * 
   * @returns { unknown[] } array of external layer add on project
   * 
   * @since 3.8.0
   */
  getSelectedExternalLayers({ type = 'vector' }) {
    return GUI.getService('catalog').getExternalSelectedLayers({ type });
  }

  /**
   * @returns {Promise<[]>} a resolved request (empty array)
   * 
   * @since 3.8.0
   */
  getEmptyRequest() {
    return resolve([]);
  }

  /**
   * @param {{ type: 'vector' }}
   * 
   * @returns {boolean}
   * 
   * @since 3.8.0
   */
  hasExternalLayerSelected({ type = 'vector' }) {
    return this.getSelectedExternalLayers({ type }).length > 0;
  }

}