var inherit = require('g3w/core/utils').inherit;
var GUI = require('g3w/gui/gui');
var G3WPlugin = require('g3w/core/plugin');

var Service = require('./iternetservice');

var EditingPanel = require('./editorpanel')

function IternetPlugin(){
  this.name = "iternet"
  this.tools = [
    {
      name: "ITERNET",
      actions: [
        {id: "iternet:startEditing", name: "Gestione dati"}
      ]
    }
  ];
  
  this.init = function(config){
    Service.init(config);
  }
  
  // metodo in risposta all'azione iternet:startEditing; aggiunge il pannello alla sidebar
  this.startEditing = function(){
    var panel = new EditingPanel();
    GUI.showPanel(panel);
  }
}
inherit(IternetPlugin,G3WPlugin);

module.exports = new IternetPlugin
