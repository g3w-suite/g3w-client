var inherit = require('g3w/core/utils').inherit;
var resolvedValue = require('g3w/core/utils').resolvedValue;
var rejectedValue = require('g3w/core/utils').rejectedValue;
var ProjectsRegistry = require('g3w/core/projectsregistry');
var GUI = require('g3w/gui/gui');
var G3WPlugin = require('g3w/core/plugin');

var Service = require('./iternetservice');

var EditingPanel = require('./editorpanel')

function IternetPlugin(){
  this.config = null;
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
    this.config = config;
    if (this.isCurrentProjectCompatible(config)) {
      Service.init(config);
      return resolvedValue();
    }
    return rejectedValue();
  };
  
  this.isCurrentProjectCompatible = function(config){
    var gid = config.gid;
    var project = ProjectsRegistry.getCurrentProject();
    if (gid == project.gid) {
      return true;
    }
    return false;
  };
  
  // metodo in risposta all'azione iternet:startEditing; aggiunge il pannello alla sidebar
  this.startEditing = function(){
    var panel = new EditingPanel();
    GUI.showPanel(panel);
  };
}
inherit(IternetPlugin,G3WPlugin);

module.exports = new IternetPlugin
