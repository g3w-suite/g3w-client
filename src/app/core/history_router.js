import G3WObject from './g3wobject';

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
 * var route = RouterService.addRoute('map/{?query}',function(query) {
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

class RouterService extends G3WObject {
  constructor() {
    super({
      setters: {
        setRouteQuery(routeQuery) {
          this._routeQuery = routeQuery;
          crossroads.parse(routeQuery);
        }
      }
    });
    this._initialLocationQuery;
    this._routeQuery = '';
    History.Adapter.bind(window,'statechange',() =>{
      const state = History.getState();
      const locationQuery = state.hash;
      if(state.data && state.data.routequery) {
        this.setRouteQuery(state.data.routequery);
      }
      else {
        this._setRouteQueryFromLocationQuery(locationQuery);
      }
    });
  }

  init() {
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

  goto(routeQuery) {
    //var pathb64 = Base64.encode(path);
    //History.pushState({path:path},null,'?p='+pathb64);
    if (!this._initialQuery) {
      this._initialLocationQuery = this._stripInitialQuery(location.search.substring(1));
    }
    if (routeQuery) {
      let encodedRouteQuery = this._encodeRouteQuery(routeQuery);
      const path = '?'+this._initialLocationQuery + '&q='+encodedRouteQuery;
      History.pushState({routequery:routeQuery},null,path);
    }
  };

  makeQueryString(queryParams) {};

  slicePath(path) {
    return path.split('?')[0].split('/');
  };

  sliceFirst(path) {
    const pathAndQuery = path.split('?');
    const queryString = pathAndQuery[1];
    const pathArr = pathAndQuery[0].split('/')
    const firstPath = pathArr[0];
    path = pathArr.slice(1).join('/');
    path = [path,queryString].join('?')
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

  getQueryString(path) {
    return path.split('?')[1];
  };

  _getQueryPortion(query,queryKey) {
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
    //var pathb64 = this.getQueryParams(locationQuery)['q'];
    //var path = pathb64 ? Base64.decode(pathb64) : '';
    const encodedRouteQuery = this._getRouteQueryFromLocationQuery(locationQuery);
    if (encodedRouteQuery) {
      const routeQuery = this._decodeRouteQuery(encodedRouteQuery);
      this.setRouteQuery(routeQuery);
    }
  };

  _getRouteQueryFromLocationQuery(locationQuery) {
    return this.getQueryParams(locationQuery)['q'];
  };

  _stripInitialQuery(locationQuery) {
    const previousQuery = this._getQueryPortion(locationQuery,'q');
    if (previousQuery) {
      const previousQueryLength = previousQuery.length;
      const previousQueryPosition = locationQuery.indexOf(previousQuery);
      var queryPrefix = _.trimEnd(locationQuery.substring(0,previousQueryPosition),"&");
      var querySuffix = locationQuery.substring(previousQueryPosition+previousQueryLength);
      querySuffix = (queryPrefix != "") ? querySuffix : _.trimStart(querySuffix,"&");
      locationQuery = queryPrefix + querySuffix;
    }
    return locationQuery;
  };
}

export default new RouterService();
