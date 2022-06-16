import utils from 'core/utils/utils';
import ProjectsRegistry from 'core/project/projectsregistry';
import DataRouterService from 'core/data/routerservice';
import GUI from 'gui/gui';
import G3WObject from 'core/g3wobject';

class BaseIframeService extends G3WObject {
  constructor(options = {}) {
    super(options);
    this.ready = false;
    this.mapService = GUI.getService('map');
    /**
     *
     * @type {null}
     */
    this.layers = undefined;
  }

  init() {
    // overwrite each service
  }

  /**
   * Return a qgs_layer_id array based on passed qgis_layer_id
   * @param qgs_layer_id : String , Array of Strings or null/undefined)
   * @returns Array oa qgs_layer_id strings
   * @private
   */
  getQgsLayerId({ qgs_layer_id, noValue = this.layers.map((layer) => layer.id) }) {
    return qgs_layer_id ? Array.isArray(qgs_layer_id) ? qgs_layer_id : [qgs_layer_id] : noValue;
  }

  /**
   * Method to getFeature from DataProvider
   * @private
   */
  async searchFeature({ layer, feature }) {
    const search_endpoint = ProjectsRegistry.getCurrentProject().getSearchEndPoint();
    const { field, value } = feature;
    const { data = [] } = await DataRouterService.getData('search:features', {
      inputs: {
        layer,
        search_endpoint,
        filter: utils.createFilterFormField({
          layer,
          search_endpoint,
          field,
          value,
        }),
      },
      outputs: false,
    });
    return data;
  }

  /**
   * Comme method to search feature/s by field and value
   * @param qgs_layer_id
   * @param feature
   * @param zoom
   * @param highlight
   * @returns {Promise<{qgs_layer_id: null, features: [], found: boolean}>}
   */
  async findFeaturesWithGeometry({
    qgs_layer_id = [], feature, zoom = false, highlight = false,
  } = {}) {
    const response = {
      found: false,
      features: [],
      qgs_layer_id: null,
    };
    const layersCount = qgs_layer_id.length;
    let i = 0;
    while (!response.found && i < layersCount) {
      const layer = ProjectsRegistry.getCurrentProject().getLayerById(qgs_layer_id[i]);
      try {
        const data = layer && await this.searchFeature({
          layer,
          feature,
        });
        if (data.length) {
          const { features } = data[0];
          response.found = features.length > 0 && !!features.find((feature) => feature.getGeometry());
          if (response.found) {
            response.features = features;
            response.qgs_layer_id = qgs_layer_id[i];
            zoom && this.mapService.zoomToFeatures(features, {
              highlight,
            });
          } else i++;
        } else i++;
      } catch (err) { i++; }
    }
    // in case of no response zoom too initial extent
    !response.found && this.mapService.zoomToProjectInitExtent();

    return response;
  }

  /**
   * Set layer function
   * @param layers
   */
  setLayers(layers = []) {
    this.layers = layers;
  }

  getLayers() {
    return this.layers;
  }

  /**
   * Method to set ready the service
   * @param bool
   */
  setReady(bool = false) {
    this.ready = bool;
  }

  getReady() {
    return this.ready;
  }

  /**
   * Method overwrite single service: Usefult to sto eventually running action
   * * @returns {Promise<void>}
   */
  async stop() {}

  /**
   * Overwrite each single service
   */
  clear() {
    // overwrite single service
  }
}

export default BaseIframeService;
