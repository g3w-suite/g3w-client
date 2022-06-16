import utils from 'core/utils/utils';
import DataRouterService from 'core/data/routerservice';
import geoutils from 'core/utils/geo';
import G3WObject from 'core/g3wobject';
import ProjectsRegistry from 'core/project/projectsregistry';
import CatalogLayersStoresRegistry from 'core/catalog/cataloglayersstoresregistry';

class RelationsService extends G3WObject {
  // constructor() {
  //   super();
  // }

  createUrl(options = {}) {
    const currentProject = ProjectsRegistry.getCurrentProject();
    // type : <editing, data, xls>
    const {
      layer = {}, relation = {}, fid, type = 'data',
    } = options;
    let layerId;
    const {
      father, child, referencedLayer, referencingLayer, id: relationId,
    } = relation;
    if (father !== undefined) layerId = layer.id === father ? child : father;
    else layerId = layer.id === referencedLayer ? referencingLayer : referencedLayer;
    const dataUrl = currentProject.getLayerById(layerId).getUrl(type);
    const value = geoutils.sanitizeFidFeature(fid);
    return `${dataUrl}?relationonetomany=${relationId}|${value}&formatter=1`;
  }

  getRelations(options = {}) {
    const url = this.createUrl(options);
    return utils.XHR.get({
      url,
    });
  }

  /**
   * Get relations NM
   * @param nmRelation
   * @param features
   * @returns {Promise<[]>}
   */
  async getRelationsNM({ nmRelation, features = [] } = {}) {
    const { referencedLayer, referencingLayer, fieldRef: { referencingField, referencedField } } = nmRelation;
    let relationsNM = []; // start with empty relations result
    if (features.length) {
      const values = features.map((feature) => feature.attributes[referencingField]);
      const responseFids = await DataRouterService.getData('search:features', {
        inputs: {
          layer: CatalogLayersStoresRegistry.getLayerById(referencedLayer),
          filter: `${utils.createSingleFieldParameter({
            field: referencedField,
            value: values,
            logicop: 'OR',
          })}`,
          formatter: 1, // set formatter to
          search_endpoint: 'api',
        },
        outputs: null,
      });
      if (responseFids.data && responseFids.data[0] && Array.isArray(responseFids.data[0].features)) {
        relationsNM = responseFids.data[0].features.map((feature) => {
          const attributes = geoutils.getAlphanumericPropertiesFromFeature(feature.getProperties()).reduce((accumulator, property) => {
            accumulator[property] = feature.get(property);
            return accumulator;
          }, {});
          return {
            id: feature.getId(),
            attributes,
            geometry: feature.getGeometry(),
          };
        });
      }
    }
    return relationsNM;
  }

  save(options = {}) {
    const url = this.createUrl(options);
    return utils.XHR.fileDownload({
      url,
      httpMethod: 'GET',
    });
  }
}

export default new RelationsService();
