//var Application = require('lib/sdk/sdk').core.Application;

var Template = function(){

  this.config = {};
  this.init = function(config) {
    this.config = config;
    this._buildtemplate();
  };
  this._buildTemplate = function() {
    //codice qui
  }
};

module.exports = new Template();
