var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var resolve = require('core/utils/utils').resolve;
var ProjectsRegistry = require('core/project/projectsregistry');


// FILTRI
var Filters = {
  eq: '=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '=<',
  like: 'LIKE',
  ilike: 'ILKE',
  AND: 'AND',
  OR: 'OR',
  NOT: '!='
};

function QueryQGISWMSProvider() {

  self = this;
  //funzione che fa la richiesta vera e propria al server qgis
  this.submitGetFeatureInfo = function(options) {

    var url = options.url || '';
    var querylayer = options.querylayer || null;
    var filter = options.filter || null;
    var bbox = options.bbox || ProjectsRegistry.getCurrentProject().state.extent.join(',');
    var simpleWmsSearchMaxResults = null;
    $.get( url, {
        'SERVICE': 'WMS',
        'VERSION': '1.3.0',
        'REQUEST': 'GetFeatureInfo',
        'LAYERS': querylayer,
        'QUERY_LAYERS': querylayer,
        'FEATURE_COUNT': (typeof simpleWmsSearchMaxResults != 'undefined' ? simpleWmsSearchMaxResults : 10),
        'INFO_FORMAT': 'text/xml',
        'CRS': 'EPSG:4326',
        'FILTER': filter,
        // Temporary fix for https://hub.qgis.org/issues/8656 (fixed in QGIS master)
        'BBOX': bbox // QUI CI VA IL BBOX DELLA MAPPA
      }
    ).then(function(response){
      console.log(response);
      //self.emit('searchdone', response)

    });
   };

  //funzione che fa la ricerca
  this.doSearch = function(queryFilterObject){
    var ogcservertype = queryFilterObject.type;
    var url = queryFilterObject.url;
    var querylayer = queryFilterObject.querylayer;
    var filterObject = queryFilterObject.filterObject;
    //creo il filtro
    var filter = this.createFilter(filterObject, querylayer);
    console.log(filter);
    //eseguo la richiesta
    this.submitGetFeatureInfo({
      url: url,
      filter: filter,
      querylayer: querylayer
    });
    //return resolve(response)
  };

  this.createFilter = function(filterObject, querylayer) {

    /////inserisco il nome del layer (typename) ///
    var filter = [];
    function createSingleFilter(booleanObject) {
      var filterElements = [];
      var filterElement = '';
      var valueExtra = "";
      var valueQuotes = "";
      var rootFilter;
      _.forEach(booleanObject, function(v, k, obj) {
        //creo il filtro root che sarà AND OR
        rootFilter = Filters[k];
        //qui c'è array degli elementi di un booleano
        _.forEach(v, function(input){
          //scorro su oggetto
          _.forEach(input, function(v, k, obj) {
          //verifico se il valore dell'oggetto è array e quindi è altro oggetto padre booleano
            if (_.isArray(v)) {
              filterElement = createSingleFilter(obj);
            } else { // è un oggetto operatore
              if (k == 'like') {
                valueExtra = "%";
              };
              filterOp = Filters[k];
              _.forEach(input, function(v, k, obj) {
                _.forEach(v, function(v, k, obj) {
                  //verifico se il valore non è un numero e quindi aggiungo singolo apice
                  if(isNaN(v)) {
                    valueQuotes = "'";
                  } else {
                    valueQuotes = "";
                  };
                  filterElement = "\"" + k + "\" "+ filterOp +" " + valueQuotes + valueExtra + v + valueExtra + valueQuotes;
                });
              });
            };
            filterElements.push(filterElement);
          });
        });
        rootFilter = filterElements.join(" '"+ rootFilter + "' ");
      });
      return rootFilter;
    };
    //assegno il filtro creato
    filter = querylayer + ":" + createSingleFilter(filterObject);
    return filter;
  };

};

inherit(QueryQGISWMSProvider, G3WObject);

module.exports =  new QueryQGISWMSProvider();
