var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var resolve = require('core/utils/utils').resolve;
//Definisco oggetti filtro per ogni tipologia
var standardFilterTemplates = function() {
  var common = {
    propertyName:
          "<PropertyName>" +
            "[PROP]" +
          "</PropertyName>",
    literal:
          "<Literal>" +
            "[VALUE]" +
          "</Literal>"
  };
  return {
    eq: "<PropertyIsEqualTo>" +
            common.propertyName +
            common.literal +
        "</PropertyIsEqualTo>",
    gt: "<PropertyIsGreaterThan>" +
            common.propertyName +
            common.literal +
         "</PropertyIsGreaterThan>",
    gte:"",
    lt: "",
    lte: "",
    like: "",
    ilike: "",
    AND: "<And>[AND]</And>",
    OR: "<Or>[OR]</Or>",
  }
}();

var qgisFilterTemplates = {
  // codice qui
};

var mapserverFilterTemplates = {
  // codice qui
};

var geoserverFilterTemplates = {
  // codice qui
};

function QueryWMSProvider(){
  var self = this;
  var d = $.Deferred();
  var parser = new ol.format.WMSGetFeatureInfo();
  var results = {
    headers:[],
    values:[]
  };

  this.doSearch = function(queryFilterObject){
    var ogcservertype = queryFilterObject.type;
    var url = queryFilterObject.url;
    var querylayer = queryFilterObject.querylayer;
    var filterObject = queryFilterObject.filterObject;
    var response, filter;
    switch (ogcservertype) {
      case 'standard':
        filter = this.createStandardFilter(filterObject);
        response = this.standardSearch(querylayer, url, filter);
        return resolve(response)
        break;
      case 'qgis':
        filter = this.createQgisFilter(filterObject);
        response = this.qgisSearch(querylayer, url, filter);
        return resolve(response)
        break;
      case 'mapserver':
        filter = this.createMapserverFilter(filterObject);
        response = this.mapserverSearch(querylayer, url, filter);
        return resolve(response)
        break;
      case 'geoserver':
        filter = this.createGeoserverFilter(filterObject);
        response = this.geoserverSearch(querylayer, url, filter);
        return resolve(response)
        break;
      default:
        return false
    }
  };
  this.standardSearch = function(querylayer, url, filter){
    var url = url || 'http://wms.pcn.minambiente.it/ogc?map=/ms_ogc/wfs/Accelerazioni_Confronto_ERS_ENVISAT_Ascending.map&service=wfs&request=getFeature&VERSION=1.1.0&TYPENAME=PI.CONFRONTOERSENVISAT.ASCENDING&MAXFEATURES=1&FILTER=';
    var filter = filter || '<Filter><PropertyIsGreaterThan><PropertyName>indice_var</PropertyName><Literal>1</Literal></PropertyIsGreaterThan></Filter>';
    url = url + filter;
    $.get(url,function(result){
      var features = parser.readFeatures(result);
      var fillheaders = true;
      _.forEach(features, function(feature){
        var listValuesFeature = [];
        fillheaders = (results['headers'].length) ? false : true;
        _.forEach(feature.values_,function(v,k,o){
          if (k!='boundary' && k!='boundedBy' && k!='lineage') {
            if (fillheaders) {
              results['headers'].push(k)
            };
            listValuesFeature.push(v);
          }
        });
        results['values'].push(listValuesFeature);
      });
      d.resolve(results);
      self.emit("searchresults",results);
    });
    return d.promise();
  };
  this.createStandardFilter = function(filterObject) {
    var filter = ['<Filter>'];
    var root;
    var rootKey;
    var filterElement = '';
    var filterElements = [];
    _.forEach(filterObject, function(v, k, obj) {
      root = standardFilterTemplates[k];
      rootKey = k;
      _.forEach(v, function(input){
        _.forEach(input, function(v, k, obj) {
          filterElement = standardFilterTemplates[k];
          _.forEach(input, function(v, k, obj) {
            _.forEach(v, function(v, k, obj) {
              filterElement = filterElement.replace('[PROP]', k);
              filterElement = filterElement.replace('[VALUE]', v);
            });
          });
          filterElements.push(filterElement);
        });
      });
    });
    root = root.replace('['+rootKey+']', filterElements.join(''));
    filter.push(root);
    filter.push('</Filter>');
    return filter.join('');
  };
  this.qgisSearch = function(urls, filter){
    $.get(searchUrl,function(result){
      self.emit("searchresults",result);
    });
    return d.promise();
  };
  this.createQGisFilter = function(filterObject) {
    var filter;
    return filter
  };
  this.mapserverSearch = function(querylayer, url, filter){
    return d.promise();
  };
  this.createMapserverFilter = function(filterObject) {
    var filter;
    return filter
  };
  this.geoserverSearch = function(querylayer, url, filter){
    return d.promise();
  };
  this.createGeoserverFilter = function(filterObject) {
    var filter;
    return filter
  };
  base(this);
}
inherit(QueryWMSProvider,G3WObject);

module.exports =  new QueryWMSProvider()

