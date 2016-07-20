var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var ProjectsRegistry = require('core/project/projectsregistry');
var QueryWFSProvider = require('./queryWFSProvider');

function SearchQueryService(){
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
    var layerFilterInfo = this.getLayerInfoFromProjectConfig(layerId);
    return {
      type: 'standard',
      url: '',
      querylayer: layerId,
      filterObject : filterObject
    }
  };

  this.getLayerInfoFromProjectConfig = function(layerId) {
    var layerFilterInfo = {};
    var Project = ProjectsRegistry.getCurrentProject();
    var layerInfo = Project.getLayerById(layerId);
    if (layerInfo) {
      if (layerInfo.source && layerInfo.source.url){
        layerFilterInfo.url = layerInfo.source.url;
      } else {
        layerFilterInfo.url = Project.getWmsUrl();
      };
    };
    return layerFilterInfo;
  };

  this.doQuerySearch = function(queryFilterObject){
    QueryWFSProvider.doSearch(queryFilterObject)
    .then(function(result){
      self.emit("searchresults", result)
    });
  };
  base(this);
}
inherit(SearchQueryService,G3WObject);

module.exports =  new SearchQueryService

