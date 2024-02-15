import * as vueComponentOptions from 'components/StreetView.vue';

const { base, inherit } = require('utils');
const Component = require('gui/component/component');

const InternalComponent = Vue.extend(vueComponentOptions);

const StreetViewComponent = function(options={}) {
  base(this);
  const {keyError} = options;
  const internalComponent = new InternalComponent({
    keyError
  });
  this.setInternalComponent(internalComponent);
  this.unmount = function() {
    return base(this, 'unmount');
  }
};

inherit(StreetViewComponent, Component);


module.exports = StreetViewComponent;


