var resolvedValue = require('g3w/core/utils').resolvedValue;
var rejectedValue = require('g3w/core/utils').rejectedValue;
var GUI = require('g3w/gui/gui');
var ProjectService = require('g3w/core/projectservice').ProjectService;
var MapService = require('g3w/core/mapservice');

var ListPanelComponent = Vue.extend({
  template: require('./listpanel.html'),
  methods: {
    exec: function(cbk){
      var relations = this.state.relations || null;
      cbk(this.state.fields,relations);
      GUI.closeForm();
    }
  }
});


function ListPanel(options){
  // proprietà necessarie. In futuro le mettermo in una classe Panel da cui deriveranno tutti i pannelli che vogliono essere mostrati nella sidebar
  this.panelComponent = null;
  this.options =  options || {};
  this.id = options.id || null; // id del form
  this.name = options.name || null; // nome del form
  
  this.state = {
    list: options.list || []
  }
  
  this._listPanelComponent = options.listPanelComponent || ListPanelComponent;
}

var proto = ListPanel.prototype;

// viene richiamato dalla toolbar quando il plugin chiede di mostrare un proprio pannello nella GUI (GUI.showPanel)
proto.onShow = function(container){
  var panel = this._setupPanel();
  this._mountPanel(panel,container);
  return resolvedValue(true);
};

// richiamato quando la GUI chiede di chiudere il pannello. Se ritorna false il pannello non viene chiuso
proto.onClose = function(){
  this.panelComponent.$destroy(true);
  this.panelComponent = null;
  return resolvedValue(true);
};

proto._setupPanel = function(){
  var panel = this.panelComponent = new this._listPanelComponent({
    panel: this
  });
  panel.state = this.state;
  return panel
};

proto._mountPanel = function(panel,container){
  panel.$mount().$appendTo(container);
};

module.exports = {
  ListPanelComponent: ListPanelComponent,
  ListPanel: ListPanel
}
