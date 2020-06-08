const inherit = require('core/utils/utils').inherit;
const Component = require('gui/vue/component');
const base = require('core/utils/utils').base;
import Layer from './layer.vue'

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
