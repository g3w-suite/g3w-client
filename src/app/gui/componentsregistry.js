import G3WObject from 'core/g3wobject';
//class Componet Registry (singleton)
// store all components added
class ComponentsRegistry extends G3WObject {
  constructor() {
    super();
    this.components = {};
  };

  registerComponent(component) {
    const id = component.getId();
    if (!this.components[id]) {
      this.components[id] = component;
      this.fire('componentregistered', component);
    }
  };

  getComponent(id) {
    return this.components[id];
  };

  getComponents() {
    return this.components;
  };

  unregisterComponent(id) {
    const component = this.components[id];
    if (component) {
      if (typeof component.destroy === 'function') component.destroy();
      this.components[id] = null;
    }
    return component;
  };
}

export default  new ComponentsRegistry;
