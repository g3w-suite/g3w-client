import GUI  from 'gui/gui';
import G3WObject from 'core/g3wobject';
import ProjectsRegistry  from 'core/project/projectsregistry';
import ProjectMetadataComponent  from './vue/components/project/project';
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

class MetadataService extends G3WObject{
  constructor() {
    super();
    this.content = null;
    this.show = false;
    this.state = {
      name: '',
      groups: {}
    };
    this._buildProjectGroupMetadata();
  }

  _buildProjectGroupMetadata() {
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

  getProjectMetadata() {
    return this.state;
  };

  getLayersMetadata() {
    return this.state.groups.layers;
  };

  getLayerMetadata(id) {
    const layerMetadata = this.state.groups.layers.filter(layer => layer.id === id);
    return layerMetadata[0];
  };

  showMetadata(bool) {
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

  reload() {
    this.emit('reload');
    this._buildProjectGroupMetadata();
  };

}

export default  MetadataService;
