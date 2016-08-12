var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var ProjectsRegistry = require('core/project/projectsregistry');
var QueryWFSProvider = require('./queryWFSProvider');
var QueryQGISWMSProvider = require('./queryQGISWMSProvider');
var ComponentsRegistry = require('sdk/gui/componentsregistry');

var Provider = {
  'QGIS': QueryQGISWMSProvider,
  'OGC': QueryWFSProvider
};
//oggetto query service
function QueryService(){
  var self = this;
  this.url = "";
  this.filterObject = {};
  this.queryFilterObject = {};
  //me lo porto da mapqueryservice ma vediamo cosa succede
  this.init = function(map){
    this.map = map;
  }
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

  /////PARSERS //////////////////

  // Brutto ma per ora unica soluzione trovata per dividere per layer i risultati di un doc xml wfs.FeatureCollection.
  // OL3 li parserizza tutti insieme non distinguendo le features dei diversi layers
  this._parseLayerFeatureCollection = function(queryLayer, data) {
    var features = [];
    var layerName = queryLayer.queryLayerName;
    var layerData = _.cloneDeep(data);
    layerData.FeatureCollection.featureMember = [];

    var featureMembers = data.FeatureCollection.featureMember;
    _.forEach(featureMembers,function(featureMember){
      var isLayerMember = _.get(featureMember,layerName)

      if (isLayerMember) {
        layerData.FeatureCollection.featureMember.push(featureMember);
      }
    });

    var x2js = new X2JS();
    var layerFeatureCollectionXML = x2js.json2xml_str(layerData);
    var parser = new ol.format.WMSGetFeatureInfo();
    return parser.readFeatures(layerFeatureCollectionXML);
  };

  // mentre con i risultati in msGLMOutput (da Mapserver) il parser può essere istruito per parserizzare in base ad un layer di filtro
  this._parseLayermsGMLOutput = function(queryLayer, data){
    var parser = new ol.format.WMSGetFeatureInfo({
      layers: [queryLayer.queryLayerName]
    });
    return parser.readFeatures(data);
  };

  //// FINE PARSER ////

  this.getGetFeatureInfoUrl = function(mapLayer,coordinate){
    //var parser = new ol.format.WMSGetFeatureInfo();
    var resolution = this.map.getView().getResolution();
    var epsg = this.map.getView().getProjection().getCode();
    var params = {
      QUERY_LAYERS: _.map(mapLayer.getQueryLayers(),'queryLayerName'),
      INFO_FORMAT: mapLayer.getInfoFormat(),
      // PARAMETRI DI TOLLERANZA PER QGIS SERVER
      FI_POINT_TOLERANCE: 10,
      FI_LINE_TOLERANCE: 10,
      FI_POLYGON_TOLERANCE: 10
    }
    var url = mapLayer.getGetFeatureInfoUrl(coordinate,resolution,epsg,params);
    return url;
  };

  //INIZO SEZIONE QUERIES ///

  // Messo qui generale la funzione che si prende cura della trasformazione dell'xml di risposta
  // dal server così da avere una risposta coerente in termini di formato risultati da presentare
  // nel componente QueryResults
  this.handleQueryResponseFromServer = function(response, queryLayers) {
    var jsonresponse;
    var featuresForLayerNames = {};
    var d = $.Deferred();
    var x2js = new X2JS();
    try {
      if (_.isString(response)) {
        jsonresponse = x2js.xml_str2json(response);
      } else {
        jsonresponse = x2js.xml2json(response);
      }
    }
    catch (e) {
      d.reject(e);
    }
    var rootNode = _.keys(jsonresponse)[0];
    var parser, data;
    switch (rootNode) {
      case 'FeatureCollection':
        parser = this._parseLayerFeatureCollection;
        data = jsonresponse;
        break;
      case "msGMLOutput":
        parser = this._parseLayermsGMLOutput;
        data = response;
        break;
    };
    var nfeatures = 0
    _.forEach(queryLayers,function(queryLayer) {
      var features = parser.call(self, queryLayer, data)
      nfeatures += features.length;
      featuresForLayerNames[queryLayer.layerName] = features;
    });
    var projectLayers = ProjectsRegistry.getCurrentProject().getLayers();
    var featuresForLayers = [];
    var layer;
    _.forEach(featuresForLayerNames,function(features, layerName){
      _.forEach(projectLayers, function(layerObj, layerId) {
        // caso layers QGIS
        if (layerObj.name == layerName) {
          layer = layerObj;
          return true;
        } else if (layerObj.source) {
          //caso WMS layer
          if (layerObj.source.layers == layerName) {
            layer = layerObj;
            return true;
          }
        }
      });
      featuresForLayers.push({
        layer: layer,
        features: features
      })
    });
    d.resolve(featuresForLayers);
    return d.promise();
  };
  // query basato sul filtro

  this.queryByFilter = function(queryFilterObject) {
    var self = this;
    var d = $.Deferred();
    //parte da rivedere nel filtro
    var provider = Provider[queryFilterObject.servertype];
    //ritorna una promise poi gestita da che la chiede
    provider.doSearch(queryFilterObject).
    then(function(response) {
      //al momento qui replico struttura per i parser
      var queryLayers = [];
      var queryLayer = {};
      queryLayer.queryLayerName = queryLayer.layerName = queryFilterObject.querylayer;
      queryLayers.push(queryLayer);
      self.handleQueryResponseFromServer(response, queryLayers)
      .then(function(featuresForLayers) {
            d.resolve({
              data: featuresForLayers,
              query: {
                filter: queryFilterObject
              }
            });
      })
    })
    .fail(function(e){
          d.reject(e);
    })
    return d.promise();
  };

  //query basato click/posizione nella mappa
  this.queryByLocation = function(coordinates, mapLayers) {
    var self = this;
    var d = $.Deferred();
    var urlsForLayers = {};
    _.forEach(mapLayers,function(mapLayer){
      var url = mapLayer.getQueryUrl();
      var urlHash = url.hashCode().toString();
      if (_.keys(urlsForLayers).indexOf(urlHash) == -1) {
        urlsForLayers[urlHash] = {
          url: url,
          mapLayers: []
        };
      }
      urlsForLayers[urlHash].mapLayers.push(mapLayer);
    })
    var queryUrlsForLayers = [];
    _.forEach(urlsForLayers,function(urlForLayers){
      var firstLayer = urlForLayers.mapLayers[0];
      var _getFeatureInfoUrl = self.getGetFeatureInfoUrl(firstLayer,coordinates);
      var queryBase = _getFeatureInfoUrl.split('?')[0];
      var queryString = _getFeatureInfoUrl.split('?')[1];
      var queryParams = {};
      _.forEach(queryString.split('&'),function(queryStringPair){
        var queryPair = queryStringPair.split('=');
        var key = queryPair[0];
        var value = queryPair[1];
        queryParams[key] = value;
      });

      var layerNames = [];
      var queryLayers = [];
      _.forEach(urlForLayers.mapLayers,function(mapLayer){
        var mapLayerQueryLayers = mapLayer.getQueryLayers();
        if (mapLayerQueryLayers.length) {
          queryLayers = _.concat(queryLayers,mapLayerQueryLayers);
        }
      });
      if (queryLayers.length) {

        delete queryParams['STYLES'];
        queryParams['LAYERS'] = _.map(queryLayers,'queryLayerName');
        queryParams['QUERY_LAYERS'] = _.map(queryLayers,'queryLayerName');
        queryParams['FEATURE_COUNT'] = 1000;

        var getFeatureInfoUrl = queryBase;
        var newQueryPairs = [];
        _.forEach(queryParams,function(value,key){
          newQueryPairs.push(key+'='+value);
        });
        getFeatureInfoUrl = queryBase+'?'+newQueryPairs.join('&');
        queryUrlsForLayers.push({
          url: getFeatureInfoUrl,
          queryLayers: queryLayers
        });
      }
    });

    if (queryUrlsForLayers.length > 0) {
      _.forEach(queryUrlsForLayers,function(queryUrlForLayers){
        var url = queryUrlForLayers.url;
        var queryLayers = queryUrlForLayers.queryLayers;
        $.get(url).
        then(function(response){
          self.handleQueryResponseFromServer(response, queryLayers, coordinates)
          .then(function(featuresForLayers){
            d.resolve({
              data: featuresForLayers,
              query: {
                coordinates: coordinates
              }
            });
          })
        })
        .fail(function(e){
          d.reject(e);
        })
      });
    }
    else {
      d.resolve(coordinates,0,{});
    }
    return d.promise();
  };

  //query by BBOX
  this.queryByBoundingBox = function(bbox) {
    //codice qui
  };

  //importatta query generica
  this._query = function(rect,layerId) {
    var Project = ProjectsRegistry.getCurrentProject();
    var layers;
    if (layerId) {
      layers = [Project.getLayer(layerId)];
    }
    else {
      layers = Project.getLayers();
    }
  };

  this.showQueryResults = function(results) {

      //codice qui

  };


  base(this);
}
inherit(QueryService,G3WObject);

module.exports =  new QueryService

