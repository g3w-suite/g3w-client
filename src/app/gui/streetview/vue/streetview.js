import { createCompiledTemplate } from 'gui/vue/utils';

const { base, inherit } = require('core/utils/utils');
const Component = require('gui/component/component');
const compiledTemplate = createCompiledTemplate(require('./streetview.html'));

const InternalComponent = Vue.extend({
  ...compiledTemplate,
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

const StreetViewComponent = function (options) {
  base(this);
  options = options || {};
  const { service } = options;
  this.setService(service);
  const internalComponent = new InternalComponent({
    service,
  });
  this.setInternalComponent(internalComponent);
  this.unmount = function () {
    return base(this, 'unmount');
  };
};

inherit(StreetViewComponent, Component);

module.exports = StreetViewComponent;
