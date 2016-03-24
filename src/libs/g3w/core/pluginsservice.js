var inherit = require('./utils').inherit;

function PluginsService(){
  this.state = {
    activePlugin: '',
    activePanel: {}
  };
  this.setActivePlugin = function(pluginName) {
    this.state.activePlugin = pluginName;
  };
  this.getActivePlugin = function(){
    return this.state.activePlugin;
  };
  this.setActivePanel = function(panelComponent) {
    this.state.activePanel = panelComponent;
  };
  this.getActivePanel = function(){
    return this.state.activePanel;
  };
};

// Make the public service en Event Emitter
inherit(PluginsService,EventEmitter);

module.exports = new PluginsService
