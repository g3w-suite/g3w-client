import Component  from 'gui/vue/component';
import ProjectCatalog from './project.vue'

class ProjectMetadataComponent extends Component {
  constructor({state = {}, service} = {}) {
    super();
    const vueComponent = Vue.extend(ProjectCatalog);
    this.setService(service);
    this.internalComponent = new vueComponent({
      state
    });
    this.layout = function() {};
  }
}


export default  ProjectMetadataComponent;
