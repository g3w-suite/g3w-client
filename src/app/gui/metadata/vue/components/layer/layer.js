import Component from 'gui/vue/component';
import Layer from './layer.vue';

class LayerComponent extends Component {
  constructor({ state = {}, service } = {}) {
    super();
    const vueComponent = Vue.extend(Layer);
    this.setService(service);
    this.internalComponent = new vueComponent({
      state,
    });
  }

  layout() {}
}

export default LayerComponent;
