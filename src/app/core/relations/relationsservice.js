const {inherit, XHR, base, createSingleFieldParameter} = require('core/utils/utils');
const {sanitizeFidFeature, getFeaturesFromResponseVectorApi, covertVectorFeaturesToResultFeatures, getAlphanumericPropertiesFromFeature} = require('core/utils/geo');
const G3WObject = require('core/g3wobject');
const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');

function RelationsService(options={}) {
  base(this);
}

inherit(RelationsService, G3WObject);

const proto = RelationsService.prototype;

proto.createUrl = function(options={}){
  const ProjectsRegistry = require('core/project/projectsregistry');
  const currentProject = ProjectsRegistry.getCurrentProject();
  // type : <editing, data, xls>
  const {layer={}, relation={}, fid, type='data'} = options;
  let layerId;
  const {father, child, referencedLayer, referencingLayer, id:relationId} = relation;
  if (father !== undefined) layerId = layer.id === father ? child: father;
  else layerId = layer.id === referencedLayer ? referencingLayer: referencedLayer;
  const dataUrl = currentProject.getLayerById(layerId).getUrl(type);
  const value = sanitizeFidFeature(fid);
  return `${dataUrl}?relationonetomany=${relationId}|${value}&formatter=1`;
};

proto.getRelations = function(options={}) {
  const url = this.createUrl(options);
  return XHR.get({
    url
  })
};

proto.getRelationsNM = async function({nmRelation, features}){
  const DataRouterService = require('core/data/routerservice');
  const {referencedLayer, referencingLayer, fieldRef: {referencingField, referencedField} } = nmRelation;
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
  return responseFids.data && responseFids.data[0].features.map(feature => {
    const attributes = getAlphanumericPropertiesFromFeature(feature.getProperties()).reduce((accumulator, property) =>{
      accumulator[property] = feature.get(property);
      return accumulator;
    }, {});
    return {
      id: feature.getId(),
      attributes,
      geometry: feature.getGeometry()
    }
  });
};

proto.save = function(options={}){
  const url = this.createUrl(options);
  return XHR.fileDownload({
    url,
    httpMethod: "GET"
  })
};

module.exports = new RelationsService;
