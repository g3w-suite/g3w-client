import { createCompiledTemplate } from 'gui/vue/utils';
import Component from 'gui/component/component';
import PrintService from 'gui/print/printservice';
import SelectAtlasFieldValues from './components/selectatlasfieldvalues.vue';
import FidAtlasValues from './components/fidatlasvalues.vue';
import template from './print.html';

const vueComponentOptions = {
  template,
  data() {
    return {
      state: null,
      button: {
        class: 'btn-success',
        type: 'stampa',
        disabled: false,
      },
    };
  },
  components: {
    SelectAtlasFieldValues,
    FidAtlasValues,
  },
  computed: {
    disabled() {
      return this.state.output.loading || (!!this.state.atlas && this.state.atlasValues.length === 0);
    },
  },
  methods: {
    setDisabledPrintButton(bool = false) {
      this.button.disabled = bool;
    },
    setAtlasValues(values = []) {
      this.state.atlasValues = values;
    },
    onChangeTemplate() {
      this.$options.service.changeTemplate();
    },
    onChangeScale() {
      this.$options.service.changeScale();
    },
    onChangeFormat() {},
    onChangeDpi() {},
    onChangeRotation(evt) {
      if (this.state.rotation >= 0 && !_.isNil(this.state.rotation) && this.state.rotation != '') {
        this.state.rotation = (this.state.rotation > 360) ? 360 : this.state.rotation;
        evt.target.value = this.state.rotation;
      } else if (this.state.rotation < 0) {
        this.state.rotation = (this.state.rotation < -360) ? -360 : this.state.rotation;
        evt.target.value = this.state.rotation;
      } else {
        this.state.rotation = 0;
      }
      this.$options.service.changeRotation();
    },
    print() {
      this.$options.service.print();
    },
  },
};

class PrintComponent extends Component {
  constructor(options = {}) {
    super(options);
    this.title = 'print';
    this.vueComponent = vueComponentOptions;
    this.internalComponent = null;
    const service = options.service || new PrintService();
    this.setService(service);
    // init service
    this._service.init();
  }

  setInternalComponent() {
    const service = this.getService();
    const InternalComponent = Vue.extend(this.vueComponent);
    this.internalComponent = new InternalComponent({
      service,
    });
    this.state.visible = service.state.visible;
    this.internalComponent.state = service.state;
    return this.internalComponent;
  }

  _reload() {
    const service = this.getService();
    service.reload();
    this.state.visible = service.state.visible;
  }

  _setOpen(bool) {
    this._service.showPrintArea(bool);
  }
}

export default PrintComponent;
