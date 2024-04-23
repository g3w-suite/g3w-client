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

function RelationsService(options={}) {
  base(this);
}

inherit(RelationsService, G3WObject);

const proto = RelationsService.prototype;

proto.createUrl = function(options={}){
  const currentProject = ProjectsRegistry.getCurrentProject();
  // type : <editing, data, xls>
  const {layer={}, relation={}, fid, type='data', formatter=1} = options;
  let layerId;
  const {father, child, referencedLayer, referencingLayer, id:relationId} = relation;
  if (father !== undefined) layerId = layer.id === father ? child: father;
  else layerId = layer.id === referencedLayer ? referencingLayer: referencedLayer;
  const dataUrl = currentProject.getLayerById(layerId).getUrl(type);
  const value = sanitizeFidFeature(fid);
  return `${dataUrl}?relationonetomany=${relationId}|${value}&formatter=${formatter}`;
};

proto.getRelations = function(options={}) {
  const url = this.createUrl(options);
  return XHR.get({
    url
  })
};

/**
 * Get relations NM
 * @param nmRelation
 * @param features
 * @returns {Promise<[]>}
 */
proto.getRelationsNM = async function({nmRelation, features=[]}={}){
  const {referencedLayer, referencingLayer, fieldRef: {referencingField, referencedField} } = nmRelation;
  let relationsNM = []; // start with empty relations result
  if (features.length) {
    const values = features.map(feature => feature.attributes[referencingField]);
    const responseFids = await DataRouterService.getData('search:features', {
      inputs: {
        layer: CatalogLayersStoresRegistry.getLayerById(referencedLayer),
        filter: `${createSingleFieldParameter({
          field: referencedField,
          value: values,
          logicop: 'OR'
        })}`,
        formatter: 1, // set formatter to
        search_endpoint: 'api'
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

proto.save = function(options={}){
  const url = this.createUrl(options);
  return XHR.fileDownload({
    url,
    httpMethod: "GET"
  })
};

export default new RelationsService();