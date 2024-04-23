import ProjectCatalog from 'components/MetadataProject.vue'

const { inherit, base } = require('utils');
const Component = require('gui/component/component');

function ProjectMetadataComponent({state = {}, service} = {}) {
  base(this);
  const vueComponent = Vue.extend(ProjectCatalog);
  this.setService(service);
  this.internalComponent = new vueComponent({
    state
  });
  this.layout = function() {};
}

inherit(ProjectMetadataComponent, Component);

module.exports = ProjectMetadataComponent;
