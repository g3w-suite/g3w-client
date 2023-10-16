/**
 * @file Store legacy frontend components
 * @since v3.6
 * 
 * @deprecated will be probably removed after v4.x. Use Vue Single File Components (SFC) instead
 */

const G3WObject = require('core/g3wobject');
const { base, inherit } = require('utils');

//class Componet Registry (singleton)
// store all components added
function ComponentsRegistry() {
  this.components = {};
  this.registerComponent = function(component) {
    const id = component.getId();
    if (!this.components[id]) {
      this.components[id] = component;
      this.emit('componentregistered', component);
    }
  };

  this.getComponent = function(id) {
    return this.components[id];
  };

  this.getComponents = function() {
    return this.components;
  };

  this.unregisterComponent = function(id) {
    const component = this.components[id];
    if (component) {
      if (typeof component.destroy === 'function') component.destroy();
      this.components[id] = null;
    }
    return component;
  };
  base(this);
}

inherit(ComponentsRegistry, G3WObject);

export default new ComponentsRegistry();
