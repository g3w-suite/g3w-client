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
  inherit,
  XHR,
  base,
  createSingleFieldParameter
}               = require('utils');
const G3WObject = require('core/g3wobject');

function RelationsService(opts = {}) {
  base(this, opts);
}

inherit(RelationsService, G3WObject);

const proto = RelationsService.prototype;

proto.createUrl = function(opts = {}) {
  const currentProject = ProjectsRegistry.getCurrentProject();
  // type : <editing, data, xls>
  const {layer = {}, relation = {}, fid, type = 'data', formatter = 1} = opts;
  let layerId;
  const { father, child, referencedLayer, referencingLayer, id:relationId } = relation;
  if (father === undefined) {
    layerId = layer.id === referencedLayer ? referencingLayer: referencedLayer;
  } else {
    layerId = layer.id === father ? child: father;
  }
  return `${currentProject.getLayerById(layerId).getUrl(type)}?relationonetomany=${relationId}|${sanitizeFidFeature(fid)}&formatter=${formatter}`;
};

proto.getRelations = function(opts={}) {
  return XHR.get({
    url: this.createUrl(opts)
  })
};

/**
 * Get relations NM
 * @param nmRelation
 * @param features
 * @returns {Promise<[]>}
 */
proto.getRelationsNM = async function({nmRelation, features = [] } = {}) {
  const { referencedLayer, referencingLayer, fieldRef: {referencingField, referencedField} } = nmRelation;
  let relationsNM = []; // start with an empty relations result
  if (features.length) {
    const values = features.map(f => f.attributes[referencingField]);
    const responseFids = await DataRouterService.getData('search:features', {
      inputs: {
        layer: CatalogLayersStoresRegistry.getLayerById(referencedLayer),
        filter: `${createSingleFieldParameter({
          field: referencedField,
          value: values,
          logicop: 'OR'
        })}`,
        formatter: 1, // set formatter to
      },
      outputs: null
    });
    if (responseFids.data && responseFids.data[0] && Array.isArray(responseFids.data[0].features)) {
      relationsNM = responseFids.data[0].features.map(feature => {
        const attributes = getAlphanumericPropertiesFromFeature(feature.getProperties()).reduce((accumulator, property) => {
          accumulator[property] = feature.get(property);
          return accumulator;
        }, {});
        return {
          id: feature.getId(),
          attributes,
          geometry: feature.getGeometry()
        }
      })
    }
  }
  return relationsNM;
};

proto.save = function(opts = {}){
  return XHR.fileDownload({
    url:        this.createUrl(opts),
    httpMethod: "GET"
  })
};

export default new RelationsService();