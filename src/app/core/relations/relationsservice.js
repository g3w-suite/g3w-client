const { inherit, XHR, base} = require('core/utils/utils');
const G3WObject = require('core/g3wobject');

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
  let  value = fid;
  if (typeof value === 'string') {
    value = value.split('.');
    value = value.length === 1 ? value[0]: value[1];
  }
  return `${dataUrl}?relationonetomany=${relationId}|${value}`;
};

proto.getRelations = function(options={}) {
  const url = this.createUrl(options);
  return XHR.get({
    url
  })
};

proto.save = function(options={}){
  const url = this.createUrl(options);
  return XHR.fileDownload({
    url,
    httpMethod: "GET"
  })
};

module.exports = new RelationsService;
