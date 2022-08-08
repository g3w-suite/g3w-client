const {inherit, base} = require('core/utils/utils');
const Component = require('gui/component/component');
import ProjectCatalog from './project.vue'

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
