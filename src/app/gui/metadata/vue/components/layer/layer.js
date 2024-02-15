import Layer from 'components/MetadataLayer.vue';

const { inherit, base } = require('utils');
const Component = require('gui/component/component');

function LayerComponent({state = {}, service} = {}) {
  base(this);
  const vueComponent = Vue.extend(Layer);
  this.setService(service);
  this.internalComponent = new vueComponent({
    state
  });
  this.layout = function() {};
}

inherit(LayerComponent, Component);

module.exports = LayerComponent;
