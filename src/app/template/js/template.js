//var Application = require('lib/sdk/sdk').core.Application;
//var bootstrap = require('./bootstrap');
var ApplicationTemplate = function(){
  this.config = {};
  this.init = function(templateConfiguration, ApplicationService) {
    this.config = templateConfiguration;
    this.appService = ApplicationService;
    this._buildTemplate();
  };
  this._buildTemplate = function() {
    //codice qui
  }
};

module.exports =  ApplicationTemplate;
