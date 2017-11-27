var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
//prendo il plugin service di core
var WorkflowsStack = g3wsdk.core.workflow.WorkflowsStack;
var PluginService = g3wsdk.core.plugin.PluginService;
var MapLayersStoreRegistry = g3wsdk.core.map.MapLayersStoreRegistry;
var LayersStore = g3wsdk.core.layer.LayersStore;
var Session = g3wsdk.core.editing.Session;
var Layer = g3wsdk.core.layer.Layer;
var GUI = g3wsdk.gui.GUI;


function Service() {
  var self = this;
  base(this);
  this.init = function(options) {
    
  }
}

inherit(Service, PluginService);

var proto = EditingService.prototype;



module.exports = new Service;