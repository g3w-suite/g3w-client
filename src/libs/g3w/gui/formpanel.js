var GUI = require('g3w/gui/gui');

var FormPanel = Vue.extend({
  template: require('./formpanel.html'),
  methods: {
    exec: function(cbk){
      cbk();
      GUI.closeForm();
    }
  }
});

function Form(options){
  // proprietà necessarie. In futuro le mettermo in una classe Panel da cui deriveranno tutti i pannelli che vogliono essere mostrati nella sidebar
  this.panelComponent = null;
  this.options =  options || {};
  this.id = options.id;
  this.name = options.name
}

var proto = Form.prototype;

// viene richiamato dalla toolbar quando il plugin chiede di mostrare un proprio pannello nella GUI (GUI.showPanel)
proto.onShow = function(container){
  var panel = this.panelComponent = new FormPanel();
  if (this.options.buttons) {
    panel.buttons = this.options.buttons;
  }
  panel.$mount().$appendTo(container);
  return panel;
};

// richiamato quando la GUI chiede di chiudere il pannello. Se ritorna false il pannello non viene chiuso
proto.onClose = function(){
  this.panelComponent.$destroy(true);
  this.panelComponent = null;
  return true;
};

module.exports = Form;
