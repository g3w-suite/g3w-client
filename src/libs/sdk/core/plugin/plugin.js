var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var ProjectsRegistry = require('core/project/projectsregistry');
var PluginsRegistry = require('./pluginsregistry');

var Plugin = function() {

  this.name = '(no name)';
  this.config = null;
  base(this);

};

inherit(Plugin,G3WObject);

var proto = Plugin.prototype;

//recuperare il servizio associato al plugin
proto.getPluginService = function() {
  return this.service
};

//settare un servizio
proto.setPluginService = function(Service) {
  this.service = Service;
};

//recupero il nome
proto.getName = function() {
  return this.name;
};

//setto il nome
proto.setName = function(name) {
  this.name = name;
};

//recupero la configurazione del plugin dal registro dei plugins
proto.getPluginConfig = function() {
  return PluginsRegistry.getPluginConfig(this.name);
};

//verifica la compatibilià con il progetto corrente
proto.isCurrentProjectCompatible = function(projectId) {
  var project = ProjectsRegistry.getCurrentProject();
  return projectId == project.getGid();
};

//registrazione plugin se compatibile con il progetto corrente
proto.registerPlugin = function(projectId) {
  if (this.isCurrentProjectCompatible(projectId)) {
    PluginsRegistry.registerPlugin(this);
    return true;
  }
  return false;
};

// setup dell'interfaccia
proto.setupGui = function() {
  //al momento niente non so se verrà usata
};

module.exports = Plugin;
