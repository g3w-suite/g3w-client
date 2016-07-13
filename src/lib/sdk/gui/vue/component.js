var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var resolve = require('core/utils/utils').resolve;
var reject = require('core/utils/utils').reject;
var BaseComponent = require('gui/component');

var Component = function(options) {
  base(this,options);
  this.InternalComponent = null;
  this.vueComponent = null;
};

inherit(Component, BaseComponent);

var proto = Component.prototype;

// viene richiamato dalla toolbar quando il plugin chiede di mostrare un proprio pannello nella GUI (GUI.showPanel)
proto.mount = function(parent){
  var component = this.vueComponent = new this.InternalComponent();
  //component.$mount().$appendTo(parent[0]);
  //cambiato in modo che non ci sarà nessun riferimento al g3w-sidebarcomponte-placeholder
  component.$mount(parent);
  return resolve(true);
};

// richiamato quando la GUI chiede di chiudere il pannello. Se ritorna false il pannello non viene chiuso
proto.unmount = function(){
  self.vueComponent.$destroy(true);
  self.panelComponent = null;
  return resolve();
};

module.exports = Component;
