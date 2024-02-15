/**
 * @file
 * @since v3.6
 */

import G3WObject from 'core/g3wobject';

const { base,inherit, Base64 } = require('utils');


/*
 * RouterService based on  History.js (https://github.com/browserstate/history.js) e Crossroads (https://github.com/millermedeiros/crossroads.js)
 * Base concept is RouteQuery, example "map?point=21.2,42.1&zoom=12",
 * it inserts into browser and URL as quesrystring (q=map@point!21.2,41.1|zoom!12).
 * To run RouteQuery:
 *
 * RouterService.goto("map?point=21.2,42.1&zoom=12");
 *
 *To listen to router has to be add  RouterService.addRoute(pattern, callback). Es.:
 *
 * var route = RouterService.addRoute('map/{?query}',function(query){
 *  console.log(query.point);
 *  console.log(query.zoom);
 * });
 *
 * Patterns:
 *  "map/{foo}": la porzione "foo" is request, and is passed as parameter in callback
 *  "map/:foo:": la porzione "foo" è optional, 
 *  "map/:foo*: 
 *  "map/{?querystring}": mandatory
 *  "map/:?querystring:": optionals
 *
 * to remove  route:
 * RouterService.removeRoute(route);
*/

crossroads.ignoreState = true;
crossroads.greedy = true;

const RouterService = function(){

  this._initialLocationQuery;
  this._routeQuery = '';
  this.setters = {
    setRouteQuery(routeQuery){
      this._routeQuery = routeQuery;
      crossroads.parse(routeQuery);
    }
  };

  base(this);
};
inherit(RouterService, G3WObject);

const proto = RouterService.prototype;

proto.init = function() {
  //Return the querystring part of a URL
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
  if (!this._initialQuery) {
    this._initialLocationQuery = this._stripInitialQuery(location.search.substring(1));
  }
  if (routeQuery) {
    this.setRouteQuery(routeQuery);
  }
};

proto.makePermalink = function(routeQuery) {
  if (!this._initialQuery) {
    this._initialLocationQuery = this._stripInitialQuery(location.search.substring(1));
  }
  const encodedRouteQuery = this._encodeRouteQuery(routeQuery);
  //encodedRouteQuery = Base64.encode(encodedRouteQuery);
  return '?'+this._initialLocationQuery + '&q='+this._encodeRouteQuery(routeQuery);
};

proto.makeQueryString = function(queryParams){};

proto.slicePath = function(path){
  return path.split('?')[0].split('/');
};

proto.sliceFirst = function(path){
  const pathAndQuery = path.split('?');
  const queryString = pathAndQuery[1];
  const pathArr = pathAndQuery[0].split('/');
  const firstPath = pathArr[0];
  path = pathArr.slice(1).join('/');
  path = [path,queryString].join('?');
  return [firstPath,path];
};

proto.getQueryParams = function(query) {
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
  var encodedRouteQuery = this._getRouteQueryFromLocationQuery(locationQuery);
  //encodedRouteQuery = Base64.decode(encodedRouteQuery);
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
    queryPrefix = _.trimEnd(locationQuery.substring(0,previousQueryPosition),"&");
    querySuffix = locationQuery.substring(previousQueryPosition+previousQueryLength);
    querySuffix = (queryPrefix != "") ? querySuffix : _.trimStart(querySuffix,"&");
    locationQuery = queryPrefix + querySuffix;
  }
  return locationQuery;
};

export default new RouterService();
