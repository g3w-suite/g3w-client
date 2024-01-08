/**
 * @file
 * @since v3.6
 */

const { inherit, base, Base64 } = require('utils');
const G3WObject = require('core/g3wobject');

/*
 * HistoryService basato su History.js (https://github.com/browserstate/history.js) e Crossroads (https://github.com/millermedeiros/crossroads.js)
 * Il concetto di base è una RouteQuery, del tipo "map?point=21.2,42.1&zoom=12",
 * che viene inserito nello stato dell'history del browser e nella URL come parametro querystring in forma codificata (q=map@point!21.2,41.1|zoom!12).
 * Per invocare una RouteQuery:
 *
 * HistoryService.goto("map?point=21.2,42.1&zoom=12");
 *
 * Chiunque voglia rispondere ad una RouteQuery deve aggiungere una route con HistoryService.addRoute(pattern, callback). Es.:
 *
 * var route = HistoryService.addRoute('map/{?query}',function(query){
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
 * HistoryService.removeRoute(route);
*/

const HistoryService = function(){
  this._initialLocationQuery;
  this._routeQuery = '';
  this.setters = {
    setRouteQuery(routeQuery){
      this._routeQuery = routeQuery;
      crossroads.parse(routeQuery);
    }
  }

  History.Adapter.bind(window,'statechange',() =>{
      const state = History.getState();
      const locationQuery = state.hash;
      if(state.data && state.data.routequery){
         this.setRouteQuery(state.data.routequery);
      }
      else {
        this._setRouteQueryFromLocationQuery(locationQuery);
      }
  });

  base(this);
};
inherit(RouterService,G3WObject);

const proto = RouterService.prototype;

proto.init = function(){
  const query = window.location.search;
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
    const encodedRouteQuery = this._encodeRouteQuery(routeQuery);
    const path = '?'+this._initialLocationQuery + '&q='+encodedRouteQuery;
    History.pushState({routequery:routeQuery},null,path);
  }
};

proto.makeQueryString = function(queryParams){};

proto.slicePath = function(path){
  return path.split('?')[0].split('/');
};

proto.sliceFirst = function(path){
  const pathAndQuery = path.split('?');
  const queryString = pathAndQuery[1];
  const pathArr = pathAndQuery[0].split('/')
  const firstPath = pathArr[0];
  path = pathArr.slice(1).join('/');
  path = [path,queryString].join('?')
  return [firstPath,path];
};

proto.getQueryParams = function(query){
  query = query.replace('?','');
  const queryParams = {};
  let queryPairs = [];
  if (query != "" && query.indexOf("&") == -1) {
    queryPairs = [query];
  }
  else {
    queryPairs = query.split('&');
  }
  try {
    queryPairs.forEach((queryPair) => {
      const pair = queryPair.split('=');
      const key = pair[0];
      const value = pair[1];
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
  let queryPortion;
  try {
    const queryPairs = query.split('&');
    const queryParams = {};
    queryPairs.forEach((queryPair) => {
      const pair = queryPair.split('=');
      const key = pair[0];
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
  const encodedRouteQuery = this._getRouteQueryFromLocationQuery(locationQuery);
  if (encodedRouteQuery) {
    const routeQuery = this._decodeRouteQuery(encodedRouteQuery);
    this.setRouteQuery(routeQuery);
  }
};

proto._getRouteQueryFromLocationQuery = function(locationQuery) {
  return this.getQueryParams(locationQuery)['q'];
};

proto._stripInitialQuery = function(locationQuery) {
  const previousQuery = this._getQueryPortion(locationQuery,'q');
  if (previousQuery) {
    const previousQueryLength = previousQuery.length;
    const previousQueryPosition = locationQuery.indexOf(previousQuery);
    const queryPrefix = _.trimEnd(locationQuery.substring(0,previousQueryPosition),"&");
    let querySuffix = locationQuery.substring(previousQueryPosition+previousQueryLength);
    querySuffix = (queryPrefix != "") ? querySuffix : _.trimStart(querySuffix,"&");
    locationQuery = queryPrefix + querySuffix;
  }
  return locationQuery;
};

export default new HistoryService();
