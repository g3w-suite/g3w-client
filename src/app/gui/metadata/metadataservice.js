import ProjectsRegistry from 'store/projects';
import GUI from 'services/gui';

const { inherit } = require('utils');
const G3WObject = require('core/g3wobject');
const ProjectMetadataComponent = require('gui/metadata/vue/components/project/project');

const METADATAGROUPS = {
  general: [
    'title',
    'name',
    'description',
    'abstract',
    'keywords',
    'fees',
    'accessconstraints',
    'contactinformation',
    'wms_url'
  ],
  spatial: [
    'crs',
    'extent'
  ],
  layers: [
    'layers'
  ]
};

function MetadataService() {
  this.content = null;
  this.show = false;
  this.state = {
    name: '',
    groups: {}
  };
  this._buildProjectGroupMetadata();
}

inherit(MetadataService, G3WObject);

const proto = MetadataService.prototype;

proto._buildProjectGroupMetadata = function() {
  const project = ProjectsRegistry.getCurrentProject().getState();
  this.state.name = project.title;
  const groups = {};
  Object.entries(METADATAGROUPS).forEach(([groupName, value]) => {
    groups[groupName] = {};
    value.forEach(field => {
      const fieldValue = project.metadata && project.metadata[field] ? project.metadata[field] : project[field];
      if (!!fieldValue) {
        groups[groupName][field] = {
          label: ['sdk','metadata','groups', groupName, 'fields', field].join('.'),
          value: fieldValue
        }
      }
    })
  });
  this.state.groups = groups;
};

proto.getProjectMetadata = function() {
  return this.state;
};

proto.getLayersMetadata = function() {
  return this.state.groups.layers;
};

proto.getLayerMetadata = function(id) {
  const layerMetadata = this.state.groups.layers.filter(layer => layer.id === id);
  return layerMetadata[0];
};

proto.showMetadata = function(bool) {
  this.show = bool;
  if (this.show) {
    this.content = new ProjectMetadataComponent({
      state: this.getProjectMetadata(),
      service: this
    });
    GUI.setContent({
      content: this.content,
      title: "sdk.metadata.title",
      perc: 100
    });
    this.show = true;
  } else GUI.closeContent()

};

proto.reload = function() {
  this.emit('reload');
  this._buildProjectGroupMetadata();
};



module.exports = MetadataService;
