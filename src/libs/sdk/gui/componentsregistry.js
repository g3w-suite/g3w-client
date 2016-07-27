var G3WObject = require('core/g3wobject');
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;

function ComponentsRegistry() {
  this.components = {};
  
  this.registerComponent = function(component) {
    var id = component.getId();
    if (!this.components[id]) {
      this.components[id] = component;
    }
  }; 
  
  this.getComponent = function(id) {
    return this.components[id];
  };
  
  this.unregisterComponent = function(id) {
    var component = this._components[id];
    if (component) {
      if (_.isFunction(component.destroy)) {
        component.destroy();
      }
      delete component;
      this._components[id] = null;
    }
  };
}
inherit(ComponentsRegistry,G3WObject);

module.exports = new ComponentsRegistry;
