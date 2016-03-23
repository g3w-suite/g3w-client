var inherit = require('./utils').inherit;

function PluginsService(){
  this.store = {
    activePlugin: ''
  };
  this.setActivePlugin = function(pluginName) {
    this.store.activePlugin = pluginName
  };
  this.getActivePlugin = function(project){
    return this.store.activePlugin
  };
};

// Make the public service en Event Emitter
inherit(PluginsService,EventEmitter);

module.exports = new PluginsService
