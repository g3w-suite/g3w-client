import Component from 'gui/vue/component';
import template from './streetview.html';

const InternalComponent = Vue.extend({
  template,
  data() {
    return {
      state: null,
    };
  },
  mounted() {
    this.$nextTick(() => {
      const position = this.$options.service.getPosition();
      this.$options.service.postRender(position);
    });
  },
});

class StreetViewComponent extends Component {
  constructor(options = {}) {
    super(options);
    const { service } = options;
    this.setService(service);
    const internalComponent = new InternalComponent({
      service,
    });
    this.setInternalComponent(internalComponent);
  }

  unmount() {
    return super.unmount();
  }
}

export default StreetViewComponent;
