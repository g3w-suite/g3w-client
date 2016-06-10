var inherit = require('./utils').inherit;
var base = require('./utils').base;
var G3WObject = require('g3w/core/g3wobject');
var rejectedValue = require('./utils').rejectedValue;

function ApiService(){
  this._config = null;
  this._baseUrl = null;
  this._apiUrls = {};
  
  this.init = function(config) {
    this._config = config;
    this._baseUrl = config.urls.api;
    this._apiEndpoints = config.urls.apiEndpoints;
  };
  
  this.get = function(api,options) {
    var self = this;
    var apiEndPoint = this._apiEndpoints[api];
    if (apiEndPoint) {
      var completeUrl = this._baseUrl + '/' + apiEndPoint;
      if (options.request) {
         completeUrl =+ '/' + request
      }
      var params = options.params || {};
      
      self.emit('apiquerystart');
      self.emit(api+'querystart');
      return $.get(completeUrl,params)
      .done(function(response){
        self.emit('apiqueryend',response);
        self.emit(api+'queryend',response);
        return response;
      })
      .fail(function(e){
        self.emit('apiqueryfail',e);
        self.emit(api+'queryfail',e);
        return e;
      });
    }
    else {
      return rejectedValue();
    }
  };
  
  base(this);
}
inherit(ApiService,G3WObject);

module.exports = new ApiService;
