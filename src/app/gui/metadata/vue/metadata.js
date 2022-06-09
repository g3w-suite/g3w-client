import {createCompiledTemplate} from 'gui/vue/utils';
import Component  from 'gui/vue/component';
import GUI  from 'gui/gui';
import MetadataService  from 'gui/metadata/metadataservice';
import template from './metadata.html'
const templateCompiled = createCompiledTemplate(template);

const InternalComponent = Vue.extend({
  ...templateCompiled,
  data() {
    return {
      state: null
    }
  }
});

class MetadataComponent extends Component {
  constructor(options={}) {
    super(options); this.title = "sdk.metadata.title";
    const service = options.service || new MetadataService(options);
    this.setService(service);
    this._service.on('reload', () => {
      this.setOpen(false);
    });
    GUI.on('closecontent', ()=>this.state.open = false);
  }

  setInternalComponent() {
    this.internalComponent = new InternalComponent({
      service: service
    });
    this.internalComponent.state = service.state;
    return this.internalComponent;
  };

  _setOpen(bool) {
    this._service.showMetadata(bool);
  };

}

export default  MetadataComponent;


