var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var Base64 = require('core/utils/utils').Base64;
var G3WObject = require('core/g3wobject');

/*
 * RouterService basato su History.js (https://github.com/browserstate/history.js) e Crossroads (https://github.com/millermedeiros/crossroads.js)
 * Il concetto di base è una RouteQuery, del tipo "map?point=21.2,42.1&zoom=12", 
 * che viene inserito nello stato dell'history del browser e nella URL come parametro querystring in forma codificata (q=map@point!21.2,41.1|zoom!12).
 * Per invocare una RouteQuery:
 * 
 * RouterService.goto("map?point=21.2,42.1&zoom=12");
 * 
 * Chiunque voglia rispondere ad una RouteQuery deve aggiungere una route con RouterService.addRoute(pattern, callback). Es.:
 * 
 * var route = RouterService.addRoute('map/{?query}',function(query){
 *  console.log(query.point);
 *  console.log(query.zoom);
 * });
 * 
 * Patterns:
 *  "map/{foo}": la porzione "foo" è richiesta, ed viene passata come parametro alla callback
 *  "map/:foo:": la porzione "foo" è opzionale, ed eventualmente viene passata come parametro alla callback
 *  "map/:foo*: tutto quello che viene dopo "map/"
 *  "map/{?querystring}": obbligatoria querystring, passata alla callback come oggetto dei parametri
 *  "map/:?querystring:": eventuale querystring, passata alla callback come oggetto dei parametri
 * 
 * Per rimuovere una route:
 * RouterService.removeRoute(route);
*/

var RouterService = function(){
  var self = this;
  this._initialLocationQuery;
  this._routeQuery = '';
  this.setters = {
    setRouteQuery: function(routeQuery){
      this._routeQuery = routeQuery;
      crossroads.parse(routeQuery);
    }
  }
  
  History.Adapter.bind(window,'statechange',function(){
      var state = History.getState();
      var locationQuery = state.hash;
      if(state.data && state.data.routequery){
         self.setRouteQuery(state.data.routequery);
      }
      else {
        self._setRouteQueryFromLocationQuery(locationQuery);
      }
  });
  
  base(this);
};
inherit(RouterService,G3WObject);

var proto = RouterService.prototype;

proto.init = function(){
  var query = window.location.search;
  this._setRouteQueryFromLocationQuery(query);
};

proto.addRoute = function(pattern,handler,priority) {
  return crossroads.addRoute(pattern,handler,priority);
};

proto.removeRoute = function(route) {
  return crossroads.removeRoute(route);
};

proto.removeAllRoutes = function() {
  return crossroads.removeAllRoutes();
};

proto.parse = function(request,defaultArgs) {
  return crossroads.parse(request,defaultArgs);
};

proto.goto = function(routeQuery){
  //var pathb64 = Base64.encode(path);
  //History.pushState({path:path},null,'?p='+pathb64);
  if (!this._initialQuery) {
    this._initialLocationQuery = this._stripInitialQuery(location.search.substring(1));
  }
  if (routeQuery) {
    encodedRouteQuery = this._encodeRouteQuery(routeQuery);
    var path = '?'+this._initialLocationQuery + '&q='+encodedRouteQuery;
    History.pushState({routequery:routeQuery},null,path);
  }
};

proto.makeQueryString = function(queryParams){};

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
  
proto.getQueryParams = function(query){
  query = query.replace('?','');
  var queryParams = {};
  var queryPairs = [];
  if (query != "" && query.indexOf("&") == -1) {
    queryPairs = [query];
  }
  else {
    queryPairs = query.split('&');
  }
  try {
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

proto._getQueryPortion = function(query,queryKey){
  var queryPortion;
  try {
    var queryPairs = query.split('&');
    var queryParams = {};
    _.forEach(queryPairs,function(queryPair){
      var pair = queryPair.split('=');
      var key = pair[0];
      if (key == queryKey) {
        queryPortion = queryPair;
      }
    });
  }
  catch (e) {}
  return queryPortion;
};

proto._encodeRouteQuery = function(routeQuery) {
  routeQuery = routeQuery.replace('?','@');
  routeQuery = routeQuery.replace('&','|');
  routeQuery = routeQuery.replace('=','!');
  return routeQuery;
};

proto._decodeRouteQuery = function(routeQuery) {
  routeQuery = routeQuery.replace('@','?');
  routeQuery = routeQuery.replace('|','&');
  routeQuery = routeQuery.replace('!','=');
  return routeQuery;
};

proto._setRouteQueryFromLocationQuery = function(locationQuery) {
  //var pathb64 = this.getQueryParams(locationQuery)['q'];
  //var path = pathb64 ? Base64.decode(pathb64) : '';
  var encodedRouteQuery = this._getRouteQueryFromLocationQuery(locationQuery);
  if (encodedRouteQuery) {
    var routeQuery = this._decodeRouteQuery(encodedRouteQuery);
    this.setRouteQuery(routeQuery);
  }
};

proto._getRouteQueryFromLocationQuery = function(locationQuery) {
  return this.getQueryParams(locationQuery)['q'];
};

proto._stripInitialQuery = function(locationQuery) {
  var previousQuery = this._getQueryPortion(locationQuery,'q');
  if (previousQuery) {
    var previousQueryLength = previousQuery.length;
    var previousQueryPosition = locationQuery.indexOf(previousQuery);
    var start = (previousQueryPosition == 0);
    queryPrefix = _.trimEnd(locationQuery.substring(0,previousQueryPosition),"&");
    querySuffix = locationQuery.substring(previousQueryPosition+previousQueryLength);
    querySuffix = (queryPrefix != "") ? querySuffix : _.trimStart(querySuffix,"&");
    locationQuery = queryPrefix + querySuffix;
  }
  return locationQuery;
};

var routerService = new RouterService();
routerService.init();

module.exports = routerService;
