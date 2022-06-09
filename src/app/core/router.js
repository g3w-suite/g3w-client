import G3WObject from './g3wobject';

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

class RouterService extends G3WObject {
  constructor() {
    super({
      setters: {
        setRouteQuery(routeQuery){
          this._routeQuery = routeQuery;
          crossroads.parse(routeQuery);
        }
      }
    });
    this._initialLocationQuery;
    this._routeQuery = '';
  }

  init() {
    //Return the querystring part of a URL
    const query = window.location.search;
    this._setRouteQueryFromLocationQuery(query);
  };

  addRoute(pattern,handler,priority) {
    return crossroads.addRoute(pattern,handler,priority);
  };

  removeRoute(route) {
    return crossroads.removeRoute(route);
  };

  removeAllRoutes() {
    return crossroads.removeAllRoutes();
  };

  parse(request,defaultArgs) {
    return crossroads.parse(request,defaultArgs);
  };

  goto(routeQuery){
    if (!this._initialQuery) {
      this._initialLocationQuery = this._stripInitialQuery(location.search.substring(1));
    }
    if (routeQuery) {
      this.setRouteQuery(routeQuery);
    }
  };

  makePermalink(routeQuery) {
    if (!this._initialQuery) {
      this._initialLocationQuery = this._stripInitialQuery(location.search.substring(1));
    }
    const encodedRouteQuery = this._encodeRouteQuery(routeQuery);
    //encodedRouteQuery = Base64.encode(encodedRouteQuery);
    return '?'+this._initialLocationQuery + '&q='+this._encodeRouteQuery(routeQuery);
  };

  makeQueryString(queryParams){};

  slicePath(path){
    return path.split('?')[0].split('/');
  };

  sliceFirst(path){
    const pathAndQuery = path.split('?');
    const queryString = pathAndQuery[1];
    const pathArr = pathAndQuery[0].split('/');
    const firstPath = pathArr[0];
    path = pathArr.slice(1).join('/');
    path = [path,queryString].join('?');
    return [firstPath,path];
  };

  getQueryParams(query) {
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

  getQueryString(path){
    return path.split('?')[1];
  };

  _getQueryPortion(query,queryKey){
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

  _encodeRouteQuery(routeQuery) {
    routeQuery = routeQuery.replace('?','@');
    routeQuery = routeQuery.replace('&','|');
    routeQuery = routeQuery.replace('=','!');
    return routeQuery;
  };

  _decodeRouteQuery(routeQuery) {
    routeQuery = routeQuery.replace('@','?');
    routeQuery = routeQuery.replace('|','&');
    routeQuery = routeQuery.replace('!','=');
    return routeQuery;
  };

  _setRouteQueryFromLocationQuery(locationQuery) {
    var encodedRouteQuery = this._getRouteQueryFromLocationQuery(locationQuery);
    //encodedRouteQuery = Base64.decode(encodedRouteQuery);
    if (encodedRouteQuery) {
      var routeQuery = this._decodeRouteQuery(encodedRouteQuery);
      this.setRouteQuery(routeQuery);
    }
  };

  _getRouteQueryFromLocationQuery(locationQuery) {
    return this.getQueryParams(locationQuery)['q'];
  };

  _stripInitialQuery(locationQuery) {
    var previousQuery = this._getQueryPortion(locationQuery,'q');
    if (previousQuery) {
      var previousQueryLength = previousQuery.length;
      var previousQueryPosition = locationQuery.indexOf(previousQuery);
      var queryPrefix = _.trimEnd(locationQuery.substring(0,previousQueryPosition),"&");
      var querySuffix = locationQuery.substring(previousQueryPosition+previousQueryLength);
      querySuffix = (queryPrefix != "") ? querySuffix : _.trimStart(querySuffix,"&");
      locationQuery = queryPrefix + querySuffix;
    }
    return locationQuery;
  };
}


export default new RouterService();
