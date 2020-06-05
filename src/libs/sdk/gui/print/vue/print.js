import { createCompiledTemplate } from 'gui/vue/utils';
const inherit = require('core/utils/utils').inherit;
const Component = require('gui/vue/component');
const PrintService = require('gui/print/printservice');
const base = require('core/utils/utils').base;
const t = require('core/i18n/i18n.service').t;
const compiledTemplate = createCompiledTemplate(require('./print.html'));

const vueComponentOptions = {
  ...compiledTemplate,
  data: function() {
    return {
      state: null,
      button: {
        class: "btn-success",
        type:"stampa",
        disabled: false
      }
    }
  },
  computed: {
    disabled() {
      return this.state.output.loading;
    }
  },
  methods: {
    onChangeTemplate: function() {
      this.$options.service.changeTemplate();
    },
    onChangeScale: function() {
      this.$options.service.changeScale()
    },
    onChangeFormat: function() {},
    onChangeDpi: function() {},
    onChangeRotation: function(evt) {
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
    print: function() {
      this.$options.service.print()
    }
  }
};

function PrintComponent(options={}) {
  base(this, options);
  this.title = "print";
  this.vueComponent = vueComponentOptions;
  this.internalComponent = null;
  const service = options.service || new PrintService;
  this.setService(service);
  this._service.init();
  this.setInternalComponent = function () {
    const InternalComponent = Vue.extend(this.vueComponent);
    this.internalComponent = new InternalComponent({
      service: service
    });
    this.state.visible = service.state.visible;
    this.internalComponent.state = service.state;
    return this.internalComponent;
  };

  this._reload = function() {
    const service = this.getService();
    service.reload();
    this.state.visible = service.state.visible;
  };

  this._setOpen = function(bool) {
    this._service.showPrintArea(bool);
  };
}

inherit(PrintComponent, Component);

module.exports = PrintComponent;


