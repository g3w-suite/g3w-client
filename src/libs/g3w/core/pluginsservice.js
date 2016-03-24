var inherit = require('./utils').inherit;

function PluginsService(){
  this.state = {
    activePlugin: ''
  };
  this.setActivePlugin = function(pluginName) {
    this.state.activePlugin = pluginName
  };
  this.getActivePlugin = function(project){
    return this.state.activePlugin
  };
};

// Make the public service en Event Emitter
inherit(PluginsService,EventEmitter);

module.exports = new PluginsService
