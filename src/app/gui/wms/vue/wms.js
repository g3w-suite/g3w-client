import GUI from 'gui/gui';
import Component from 'gui/vue/component';
import WMS from './wms.vue';
import Service from '../service';

const InternalComponent = Vue.extend(WMS);

class ToolsComponent extends Component {
  constructor(options = {}) {
    super(options);
    this._service = new Service(options);
    this.title = 'WMS';

    const internalComponent = new InternalComponent({
      service: this._service,
    });

    internalComponent.state = this._service.state;
    this.setInternalComponent(internalComponent);
  }

  _setOpen(bool = false) {
    this.internalComponent.state.open = bool;
    bool && GUI.closeContent();
  }
}

export default ToolsComponent;
