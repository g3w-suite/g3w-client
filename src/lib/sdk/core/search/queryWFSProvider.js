var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var ProjectService = require('core/project/projectservice').ProjectService;
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
    and: "<And>[AND]</And>",
    or: "<Or>[OR]</Or>",
  }
}();

var qgisFilterTemplaates = {
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
  }
  this.doSearch = function(request){
    var ogcservertype = request.type;
    var url = request.url;
    var filterObj = request.filterObj;
    var response, filter;
    switch (ogcservertype) {
      case 'standard':
        filter = this.createStandardFilter(filterObj);
        response = this.standardSearch(url, filter);
        return response
        break;
      case 'qgis':
        filter = this.createQgisFilter(filterObj);
        response = this.qgisSearch(url, filter);
        return response
        break;
      case 'mapserver':
        filter = this.createMapserverFilter(filterObj);
        response = this.mapserverSearch(url, filter);
        return response
        break;
      case 'geoserver':
        filter = this.createGeoserverFilter(filterObj);
        response = this.geoserverSearch(url, filter);
        return response
        break;
      default:
        return false
    }
  };
  this.standardSearch = function(url, filter){
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
  this.createStandardFilter = function(filterObj) {
    var filter = ['<Filter>'];

    filter.push('</Filter>')
    return filter.join('');
  };
  this.qgisSearch = function(urls, filter){
    $.get(searchUrl,function(result){
      self.emit("searchresults",result);
    });
    return d.promise();
  };
  this.createQGisFilter = function(filterObj) {
    var filter;
    return filter
  };
  this.mapserverSearch = function(url, filter){
    return d.promise();
  };
  this.createMapserverFilter = function(filterObj) {
    var filter;
    return filter
  };
  this.geoserverSearch = function(url, filter){
    return d.promise();
  };
  this.createGeoserverFilter = function(filterObj) {
    var filter;
    return filter
  };
  base(this);
}
inherit(QueryWMSProvider,G3WObject);

module.exports =  new QueryWMSProvider()

