/**
 * @file
 * @since v3.6
 */

import CatalogLayersStoresRegistry              from "store/catalog-layers";
import ProjectsRegistry                         from "store/projects";
import DataRouterService                        from "services/data";
import { sanitizeFidFeature }                   from "utils/sanitizeFidFeature";
import { getAlphanumericPropertiesFromFeature } from "utils/getAlphanumericPropertiesFromFeature";

const {
  XHR,
  createSingleFieldParameter
}               = require('utils');
const G3WObject = require('core/g3wobject');

export default new (class RelationsService extends G3WObject {
  constructor(opts = {}) {
    super(opts);
  }
  createUrl(opts = {}) {
    const currentProject = ProjectsRegistry.getCurrentProject();
    // type : <editing, data, xls>
    const {layer = {}, relation = {}, fid, type = 'data', formatter = 1} = opts;
    let layerId;
    const { father, child, referencedLayer, referencingLayer, id:relationId } = relation;
    if (undefined === father) {
      layerId = layer.id === referencedLayer ? referencingLayer: referencedLayer;
    } else {
      layerId = layer.id === father ? child: father;
    }
    return `${currentProject.getLayerById(layerId).getUrl(type)}?relationonetomany=${relationId}|${sanitizeFidFeature(fid)}&formatter=${formatter}`;
  };

  getRelations(opts = {}) {
    return XHR.get({
      url: this.createUrl(opts)
    })
  }

  /**
   * Get relations NM
   * @param nmRelation
   * @param features
   * @returns {Promise<[]>}
   */
  async getRelationsNM({ nmRelation, features = [] } = {}) {
    const {
      referencedLayer,
      fieldRef: { referencingField, referencedField }
    }               = nmRelation;
    let relationsNM = []; // start with an empty relations result
    if (features.length) {
      const values   = features.map(f => f.attributes[referencingField]);
      const { data } = await DataRouterService.getData('search:features', {
        inputs: {
          layer:     CatalogLayersStoresRegistry.getLayerById(referencedLayer),
          filter:    `${createSingleFieldParameter({ field: referencedField, value: values, logicop: 'OR' })}`,
          formatter: 1, // set formatter to
        },
        outputs: null
      });
      if (data && data[0] && Array.isArray(data[0].features)) {
        relationsNM = data[0].features.map(f => {
          return {
            id:         f.getId(),
            geometry:   f.getGeometry(),
            attributes: getAlphanumericPropertiesFromFeature(f.getProperties()).reduce((accumulator, property) => {
              accumulator[property] = f.get(property);
              return accumulator;
            }, {}),
          }
        })
      }
    }
    return relationsNM;
  }

  save(opts = {}) {
    return XHR.fileDownload({
      url:        this.createUrl(opts),
      httpMethod: "GET"
    })
  }
});