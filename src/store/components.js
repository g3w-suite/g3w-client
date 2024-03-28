/**
 * @file Store legacy frontend components
 * @since v3.6
 * 
 * @deprecated will be probably removed after v4.x. Use Vue Single File Components (SFC) instead
 */

import G3WObject from 'core/g3w-object';

const emitter = new G3WObject();

// store all components added
const ComponentsRegistry = {

  components: {},

  /** used only by "g3w-catalog" → "_listenToMapVisibility(map_id, component)" */
  on: emitter.on.bind(emitter),

  registerComponent(component) {
    const id = component.getId();
    if (undefined === this.components[id]) {
      this.components[id] = component;
      emitter.emit('componentregistered', component);
    }
  },

  getComponent(id) {
    return this.components[id];
  },

  getComponents() {
    return this.components;
  },

  unregisterComponent(id) {
    const component = this.components[id];
    if (component && 'function' === typeof component.destroy) {
      component.destroy();
    }
    if (component) {
      this.components[id] = null;
    }
    return component;
  },

};

export default ComponentsRegistry;