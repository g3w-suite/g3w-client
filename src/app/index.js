var config = require('./config/config.js');
var TemplateConfig = ('./config/config.template.js');
//var ApplicationService = require('sdk/sdk').core.Application;
var ApplicationService = {};
var ApplicationTemplate = require('./template/js/template');
//istanzio l'appication template
ApplicationTemplate = new ApplicationTemplate();
//passo la configurazione del template e l'applicationService che fornisce API del progetto
ApplicationTemplate.init(TemplateConfig, ApplicationService);
//rimasto da codice precedente. Da togliere?

$(function (){
  config.getWmsUrl = function(project){
    return config.server.urls.ows+'/'+config.group.id+'/'+project.type+'/'+project.id;
  };
  config.getProjectConfigUrl = function(project){
    return config.server.urls.config+'/'+config.group.id+'/'+project.type+'/'+project.id;
  }
});

/* -----------------------------------------------------------------------------------------*/


/*Application.init(config);
Application.on('ready', function(){
  // vado a inizializzare il template utilizzando il TemplateService e la configurazione passata da config
  Template.init(config.template);

});*/

