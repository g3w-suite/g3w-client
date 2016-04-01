var inherit = require('g3w/core/utils').inherit;
var GUI = require('g3w/gui/gui');
var G3WPlugin = require('g3w/core/plugin');

function IternetPlugin(){
  this.tools = [
    {
      name: "ITERNET",
      actions: [
        {id: "iternet:startEditing", name: "Avvio editing"}
      ]
    }
  ];
  
  this.startEditing = function(){
    GUI.notify.success("Iternet editing starting");
  }
}
inherit(IternetPlugin,G3WPlugin);

module.exports = new IternetPlugin
