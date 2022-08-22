import * as vueComponentOptions from 'components/StreetView.vue';

const {base, inherit} = require('core/utils/utils');
const Component = require('gui/component/component');

const InternalComponent = Vue.extend(vueComponentOptions);

const StreetViewComponent = function(options) {
  base(this);
  options = options || {};
  const service = options.service;
  this.setService(service);
  const internalComponent = new InternalComponent({
    service: service
  });
  this.setInternalComponent(internalComponent);
  this.unmount = function() {
    return base(this, 'unmount');
  }
};

inherit(StreetViewComponent, Component);


module.exports = StreetViewComponent;


