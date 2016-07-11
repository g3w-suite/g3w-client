var inherit = require('core/utils/utils').inherit;
var BaseComponent = require('gui/component');

var Component = function(options) {
  base(this,options);
  
  this.vueComponent = null;
};
inherit(Component, BaseComponent);

module.exports = Component;
