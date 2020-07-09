const inherit = require('core/utils/utils').inherit;
const Component = require('gui/vue/component');
const base = require('core/utils/utils').base;
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
