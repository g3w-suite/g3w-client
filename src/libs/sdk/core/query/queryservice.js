var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var ProjectsRegistry = require('core/project/projectsregistry');
var QueryWFSProvider = require('./queryWFSProvider');
var QueryQGISWMSProvider = require('./queryQGISWMSProvider');

var Provider = {
  'QGIS': QueryQGISWMSProvider,
  'OGC': QueryWFSProvider
};

function QueryService(){
  var self = this;
  this.url = "";
  this.filterObject = {};
  this.queryFilterObject = {};

  this.setFilterObject = function(filterObject){
    this.filterObject = filterObject;
  };

  this.getFilterObject = function() {
    return this.filterObject;
  };
  //dato l'oggetto filter restituito dal server ricostruisco la struttura del filterObject
  //interpretato da queryWMSProvider
  this.createQueryFilterFromConfig = function(filter) {

    var queryFilter = {};
    var attribute;
    var operator;
    var field;
    var operatorObject = {};
    var booleanObject = {};
    //funzione che costruisce l'oggetto operatore es. {'=':{'nomecampo':null}}
    function createOperatorObject(obj) {
      //rinizializzo a oggetto vuoto
      evalObject = {};
      //verifico che l'oggetto passato non sia a sua volta un oggetto 'BOOLEANO'
      _.forEach(obj, function(v,k) {
        if (_.isArray(v)) {
          return createBooleanObject(k,v);
        };
      });
      field = obj.attribute;
      operator = obj.op;
      evalObject[operator] = {};
      evalObject[operator][field] = null;
      return evalObject;
    };
    //functione che costruisce oggetti BOOLEANI caso AND OR contenente array di oggetti fornit dalla funzione createOperatorObject
    function createBooleanObject(booleanOperator, operations) {
      booleanObject = {};
      booleanObject[booleanOperator] = [];
      _.forEach(operations, function(operation){
        booleanObject[booleanOperator].push(createOperatorObject(operation));
      })
      return booleanObject;
    };
    /*
    // vado a creare l'oggetto filtro principale. Questo è un oggetto che contiene l'operatore booleano come root (chiave)
    // come valore un array di oggetti operatori che contengono il tipo di operatore come chiave e come valore un oggetto contenete
    // nome campo e valore passato
    */
    _.forEach(filter, function(v,k,obj) {
      queryFilter = createBooleanObject(k,v);
    });
    return queryFilter;
  };

  this.createQueryFilterObject = function(layerId, filterObject){
    var project = ProjectsRegistry.getCurrentProject();
    var layerInfo = this.getLayerInfoUrlFromProjectConfig(layerId);
    return {
      type: 'standard',
      url: layerInfo.url,
      querylayer: layerInfo.name,
      servertype: layerInfo.servertype,
      crs: layerInfo.crs,
      filterObject : filterObject
    };
  };

  this.getLayerInfoUrlFromProjectConfig = function(layerId) {
    var layerFilterInfo = {};
    var project = ProjectsRegistry.getCurrentProject();
    var layerInfo = project.getLayerById(layerId);
    if (layerInfo) {
      layerFilterInfo.name = layerInfo.name;
      layerFilterInfo.crs = project.state.crs;
      layerFilterInfo.servertype = layerInfo.servertype;
      if (layerInfo.source && layerInfo.source.url){
        layerFilterInfo.url = layerInfo.source.url;
      } else {
        layerFilterInfo.url = project.getWmsUrl();
      };
    };
    return layerFilterInfo;
  };

  this.queryByFilter = function(queryFilterObject) {
    var provider = Provider[queryFilterObject.servertype];
    provider.doSearch(queryFilterObject)
    .then(function(result){
      console.log(result);
      self.emit("searchresults", result)
    });
  };
  
  this.queryByLocation = function() {
    // interrogazione per localizzazione
  };
  base(this);
}
inherit(QueryService,G3WObject);

module.exports =  new QueryService

