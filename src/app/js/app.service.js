/*library inherit tools */
var inherit = require('g3w/core/utils').inherit;
var ProjectsRegistry = require('g3w/core/projectsregistry');
var PluginsRegistry = require('g3w/core/pluginsregistry');

function service(){
  var self = this;
  this.initialized = false;
  this.title = "G3W Client";
  this.config = null;
  this.projectConfig = null;
  this.setup = function(config){
    this.config = config;
    if (this.config.group){
      this.bootstrap();
    }
  };
  
  this.setGroup = function(group){
    if (this.config){
      this.config.group = group;
      this.bootstrap();
    }
  };
  
  // il contesto viene passato a tutti i servizi e serve per la loro configurazione, per fornirgli metodi di contesto e l'interfaccia all'applicazione
  this.createContext = function(){
    var context = {
      debug: true,
      // richiesto da ProjectService
      getWmsServiceUrl: function(project){
        return self.config.server.urls.ows+'/'+self.config.group.id+'/'+project.type+'/'+project.id;
      },
      // richiesto da ProjectsRegistry
      getProjectConfigUrl(project){
        return self.config.server.urls.config+'/'+self.config.group.id+'/'+project.type+'/'+project.id;
      },
      // iface fornirà i metodi per comunicare con la GUI dell'applicazione, utilizzati dai plugin
      iface: self,
      // le seguenti proprietà sono utilizzate da ProjectsRegistry
      projects: self.config.group.projects,
      initproject: self.config.group.initproject,
      baselayers: self.config.group.baselayers,
      crs: self.config.group.crs,
      minscale: self.config.group.minscale,
      maxscale: self.config.group.maxscale
    }
    return context;
  };
  
  this.bootstrap = function(){
    if (!this.initialized){
      var ctx = this.createContext();
      
      //inizializza la configurazione dei servizi. Ognungo percherà dal context quello di cui avrà bisogno
      //una volta finita la configurazione emette l'evento ready
      $.when(
        ProjectsRegistry.init(ctx),
        PluginsRegistry.init(ctx)
      ).then(function(){
        self.emit('ready');
        this.initialized = true;
        var ProjectService = require('g3w/core/projectservice');
        ProjectService.on("aftertoggleLayer",function(){
            console.log("after togglelayer"+arguments);
        })
      });
    }
  };
}
//lo fa diventare un oggetto emitter
inherit(service,EventEmitter);

module.exports = new service();
