/*library inherit tools */
var inherit = require('g3w/core/utils').inherit;
var ProjectsRegistry = require('g3w/core/projectsregistry');

function service(){
  var self = this;
  this.title = "G3W Client";
  this.config = null;
  this.projectConfig = null;
  this.setup = function(config){
    this.config = config;
    //una volta che la configurazione e' stata terminata (evento loadend) emesso
    //dall'oggetto layersRegistry dopo aver trminato il setup
    ProjectsRegistry.once('loaded',function(){
      self.emit('ready');
    });
    //inizializza la configurazione basata sul gruppo di progetti
    //una volta caricato il file di configurazione emette l'evento loadend
    ProjectsRegistry.setup(config);
  };
}
//lo fa diventare un oggetto emitter
inherit(service,EventEmitter);

setTimeout(function(){
  ProjectsRegistry.setCurrentProject('qdjango:open_data_firenze_2');
},2000);

var ProjectService = require('g3w/core/projectservice');
ProjectService.addStoreSetListener('layersTree[0].title',function(val,oldVal){
  console.log("Per me puoi cambiare "+oldVal+" in "+val);
  return true;
});

setTimeout(function(){
  ProjectService.storeSet('layersTree[0].title','POI 2')
},4000);


var unlisten;
setTimeout(function(){
    unlisten = ProjectService.addStoreSetListener('layersTree[0].title',function(val,oldVal){
      console.log("Per me NON puoi cambiare "+oldVal+" in "+val);
      return false;
    });
  ProjectService.storeSet('layersTree[0].title','POI 3')
},6000);

setTimeout(function(){
  unlisten();
  ProjectService.storeSet('layersTree[0].title','POI 4')
},8000);

module.exports = new service();
