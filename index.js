var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var Plugin = g3wsdk.core.plugin.Plugin;
var GUI = g3wsdk.gui.GUI;
var Service = require('./service');

var _Plugin = function(){
  base(this);
  this.name = 'editing';
  this.init = function() {
    //setto il servizio
    this.setService(Service);
    //recupero configurazione del plugin
    this.config = this.getConfig();
    // verifico se ci sono layer editabili
    if (this.service.loadPlugin()) {
      // inizializzo l'editing
      this.service.init(this.config);
      //regitro il plugin
      if (this.registerPlugin(this.config.gid)) {
        if (!GUI.ready) {
          GUI.on('ready',_.bind(this.setupGui, this));
        } else {
          this.setupGui();
        }
      }
    }
  };
  //metto su l'interfaccia del plugin
  this.setupGui = function() {
  };

  this.load = function() {
    this.init();
  }
};

inherit(_Plugin, Plugin);

(function(plugin){
  plugin.init();
})(new _Plugin);

