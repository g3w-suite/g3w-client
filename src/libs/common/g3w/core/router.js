var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var G3WObject = require('g3w/core/g3wobject');

var RouterService = function(){
  this._route = '';
  this.setters = {
    setRoute: function(path){
      this._route = path;
    }
  }
  base(this);
};
inherit(RouterService,G3WObject);

var proto = RouterService.prototype;

proto.goto = function(path){
  this.setRoute(path);
};

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
    var queryString = path.split('?')[1];
    var queryPairs = queryString.split('&');
    var queryParams = {};
    _.forEach(queryPairs,function(queryPair){
      var pair = queryPair.split('=');
      var key = pair[0];
      var value = pair[1];
      queryParams[key] = value;
    });
    return queryParams;
  };
  
proto.makeQueryString = function(queryParams){};

module.exports = new RouterService;
