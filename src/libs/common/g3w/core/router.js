var inherit = require('./utils').inherit;
var base = require('./utils').base;
var Base64 = require('./utils').Base64;
var G3WObject = require('./g3wobject');

var RouterService = function(){
  var self = this;
  this._route = '';
  this.setters = {
    setRoute: function(path){
      this._route = path;
    }
  }
  
  History.Adapter.bind(window,'statechange',function(){ // Note: We are using statechange instead of popstate
      var state = History.getState(); // Note: We are using History.getState() instead of event.state
      var hash = state.hash;
      self.setRouteFromHash(hash);
  });
  
  base(this);
};
inherit(RouterService,G3WObject);

var proto = RouterService.prototype;

proto.initRoute = function(){
  var firstHash = window.location.search;
  this.setRouteFromHash(firstHash);
}

proto.goto = function(path){
  var pathb64 = Base64.encode(path);
  History.pushState({path:path},null,'?p='+pathb64);
  //this.setRoute(path);
};

proto.setRouteFromHash = function(hash) {
  var pathb64 = this.getQueryParams(hash)['p'];
  var path = pathb64 ? Base64.decode(pathb64) : '';
  this.setRoute(path);
}

proto.slicePath = function(path){
  return path.split('?')[0].split('/');
};
  
proto.sliceFirst = function(path){
  var pathAndQuery = path.split('?');
  var queryString = pathAndQuery[1];
  var pathArr = pathAndQuery[0].split('/')
  var firstPath = pathArr[0];
  path = pathArr.slice(1).join('/');
  path = [path,queryString].join('?')
  return [firstPath,path];
};
  
proto.getQueryParams = function(path){
  var queryParams = {};
  try {
    var queryString = path.split('?')[1];
    var queryPairs = queryString.split('&');
    var queryParams = {};
    _.forEach(queryPairs,function(queryPair){
      var pair = queryPair.split('=');
      var key = pair[0];
      var value = pair[1];
      queryParams[key] = value;
    });
  }
  catch (e) {}
  return queryParams;
};

proto.getQueryString = function(path){
  return path.split('?')[1];
};
  
proto.makeQueryString = function(queryParams){};

module.exports = new RouterService;
