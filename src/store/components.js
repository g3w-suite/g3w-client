/**
 * @file Store legacy frontend components
 * @since v3.6
 * 
 * @deprecated will be probably removed after v4.x. Use Vue Single File Components (SFC) instead
 */

import G3WObject from 'core/g3wobject';

class ComponentsRegistry extends G3WObject {

  constructor() {
    super();
    this.components = {};
  }
  
  registerComponent(component) {
    const id = component.getId();
    if (!this.components[id]) {
      this.components[id] = component;
      this.emit('componentregistered', component);
    }
  }

  getComponent(id) {
    return this.components[id];
  }

  getComponents() {
    return this.components;
  }

  unregisterComponent(id) {
    const component = this.components[id];
    if (component) {
      if (typeof component.destroy === 'function') component.destroy();
      this.components[id] = null;
    }
    return component;
  }

}

/**
 * Class Componet Registry (singleton)
 * 
 * store all components added
 */
export default new ComponentsRegistry();
