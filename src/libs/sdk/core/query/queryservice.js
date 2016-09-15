var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var QueryWFSProvider = require('./queryWFSProvider');
var QueryQGISWMSProvider = require('./queryQGISWMSProvider');

var Provider = {
  'QGIS': QueryQGISWMSProvider,
  'OGC': QueryWFSProvider
};

/*var PickToleranceParams = {};
PickToleranceParams[ProjectTypes.QDJANGO] = {};
PickToleranceParams[ProjectTypes.QDJANGO][GeometryTypes.POINT] = "FI_POINT_TOLERANCE";
PickToleranceParams[ProjectTypes.QDJANGO][GeometryTypes.LINESTRING] = "FI_LINE_TOLERANCE";
PickToleranceParams[ProjectTypes.QDJANGO][GeometryTypes.POLYGON] = "FI_POLYGON_TOLERANCE";

var PickToleranceValues = {}
PickToleranceValues[GeometryTypes.POINT] = 5;
PickToleranceValues[GeometryTypes.LINESTRING] = 5;
PickToleranceValues[GeometryTypes.POLYGON] = 5;*/


//oggetto query service
function QueryService(){
  var self = this;
  this.url = "";
  this.filterObject = {};
  this.queryFilterObject = {};
  //me lo porto da mapqueryservice ma vediamo cosa succede
  this.setMapService = function(mapService){
    this._mapService = mapService;
  };

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
    }
    //functione che costruisce oggetti BOOLEANI caso AND OR contenente array di oggetti fornit dalla funzione createOperatorObject
    function createBooleanObject(booleanOperator, operations) {
      booleanObject = {};
      booleanObject[booleanOperator] = [];
      _.forEach(operations, function(operation){
        booleanObject[booleanOperator].push(createOperatorObject(operation));
      });
      return booleanObject;
    }
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

  this.createQueryFilterObject = function(layer, filterObject){
    return {
      type: 'standard',
      queryLayer: layer,
      filterObject : filterObject
    };
  };

  /////PARSERS //////////////////

  // Brutto ma per ora unica soluzione trovata per dividere per layer i risultati di un doc xml wfs.FeatureCollection.
  // OL3 li parserizza tutti insieme non distinguendo le features dei diversi layers
  this._parseLayerFeatureCollection = function(queryLayer, data) {
    var features = [];
    var layerName = queryLayer.getWMSLayerName();
    var layerData = _.cloneDeep(data);
    layerData.FeatureCollection.featureMember = [];
    
    var featureMembers = data.FeatureCollection.featureMember;
    featureMembers = _.isArray(featureMembers) ? featureMembers : [featureMembers];
    _.forEach(featureMembers,function(featureMember){
      layerName = layerName.replace(/ /g,''); // QGIS SERVER rimuove gli spazi dal nome del layer per creare l'elemento FeatureMember
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
  
  this._parseLayerGeoJSON = function(queryLayer, data) {
    var geojson = new ol.format.GeoJSON({
      defaultDataProjection: this.crs,
      geometryName: "geometry"
    });
    return geojson.readFeatures(data);
  };

  //// FINE PARSER ///

  //INIZO SEZIONE QUERIES ///

  // funzione per il recupero delle relazioni della features se ci sono
  // nell'attributo g3w_relations
  this.handleResponseFeaturesAndRelations = function(layersResponse) {
    var relations = null;
    _.forEach(layersResponse, function(layer) {
      _.forEach(layer.features, function(feature) {
        g3w_relations = feature.getProperties().g3w_relations;
        //console.log('G3WRelations: ',g3w_relations);
        relations = [];
        _.forEach(g3w_relations, function(elements, relationName) {
          relation = {};
          if (elements.length) {
            relation.name = relationName;
            relation.elements = elements;
            relations.push(relation);
          }
        });
        feature.set('relations', relations);
      });
    });
    // console.log(layersResponse);
    return layersResponse
  };

  // Messo qui generale la funzione che si prende cura della trasformazione dell'xml di risposta
  // dal server così da avere una risposta coerente in termini di formato risultati da presentare
  // nel componente QueryResults
  this.handleQueryResponseFromServer = function(response, infoFormat, queryLayers) {
    var jsonresponse;
    var featuresForLayers = [];
    var parser, data;
    switch (infoFormat) {
      case 'json':
        parser = this._parseLayerGeoJSON;
        data = response.vector.data;
        break;
      default:
        var x2js = new X2JS();
        try {
          if (_.isString(response)) {
            jsonresponse = x2js.xml_str2json(response);
          } else {
            jsonresponse = x2js.xml2json(response);
          }
        }
        catch (e) {
          return;
        }
        var rootNode = _.keys(jsonresponse)[0];
        
        switch (rootNode) {
          case 'FeatureCollection':
            parser = this._parseLayerFeatureCollection;
            data = jsonresponse;
            break;
          case "msGMLOutput":
            parser = this._parseLayermsGMLOutput;
            data = response;
            break;
        }
    }
    
    var nfeatures = 0;
    _.forEach(queryLayers,function(queryLayer) {
      var features = parser.call(self, queryLayer, data);
      nfeatures += features.length;
      featuresForLayers.push({
        layer: queryLayer,
        features: features
      })
    });

    return featuresForLayers;
  };
  // query basato sul filtro

  this.queryByFilter = function(queryFilterObject) {
    var self = this;
    var d = $.Deferred();
    //parte da rivedere nel filtro
    var provider = Provider[queryFilterObject.queryLayer.getServerType()];
    //ritorna una promise poi gestita da che la chiede
    provider.doSearch(queryFilterObject).
    then(function(response) {
      //al momento qui replico struttura per i parser
      var queryLayer = queryFilterObject.queryLayer;
      var featuresForLayers = self.handleQueryResponseFromServer(response, queryLayer.getInfoFormat(), [queryLayer]);
      self.handleResponseFeaturesAndRelations(featuresForLayers);
      d.resolve({
        data: featuresForLayers,
        query: {
          filter: queryFilterObject
        }
      });
    })
    .fail(function(e){
          d.reject(e);
    });
    return d.promise();
  };
  
  this.queryByLocation = function(coordinates, layers) {
    var self = this;
    var d = $.Deferred();
    var urlsForLayers = {};
    _.forEach(layers, function(layer){
      var queryUrl = layer.getQueryUrl();
      var urlHash = queryUrl.hashCode().toString();
      if (_.keys(urlsForLayers).indexOf(urlHash) == -1) {
        urlsForLayers[urlHash] = {
          url: queryUrl,
          layers: []
        };
      }
      urlsForLayers[urlHash].layers.push(layer);
    });

    var queryUrlsForLayers = [];
    _.forEach(urlsForLayers,function(urlForLayers){
      var queryLayers = urlForLayers.layers;
      var infoFormat = queryLayers[0].getInfoFormat();
      var params = {
        LAYERS: _.map(queryLayers,function(layer){ return layer.getQueryLayerName(); }),
        QUERY_LAYERS: _.map(queryLayers,function(layer){ return layer.getQueryLayerName(); }),
        INFO_FORMAT: infoFormat,
        // PARAMETRI DI TOLLERANZA PER QGIS SERVER
        FI_POINT_TOLERANCE: 10,
        FI_LINE_TOLERANCE: 10,
        FI_POLYGON_TOLERANCE: 10
      };
      
      var resolution = self._mapService.getResolution();
      var epsg = self._mapService.getEpsg();
      var getFeatureInfoUrl = self._mapService.getGetFeatureInfoUrlForLayer(queryLayers[0],coordinates,resolution,epsg,params);
      var queryString = getFeatureInfoUrl.split('?')[1];
      var url = urlForLayers.url+'?'+queryString;
      queryUrlsForLayers.push({
        url: url,
        infoformat: infoFormat,
        queryLayers: queryLayers
      });
    });
    if (queryUrlsForLayers.length > 0) {
      var queryRequests = [];
      var featuresForLayers = [];
      _.forEach(queryUrlsForLayers,function(queryUrlForLayers){
        var url = queryUrlForLayers.url;
        var queryLayers = queryUrlForLayers.queryLayers;
        var infoFormat = queryUrlForLayers.infoformat;
        var request = self.doRequestAndParse(url,infoFormat,queryLayers);
        queryRequests.push(request);
      });
      $.when.apply(this, queryRequests).
      then(function(){
        var vectorsDataResponse = Array.prototype.slice.call(arguments);
        _.forEach(vectorsDataResponse, function(_featuresForLayers){
          if(featuresForLayers){
            featuresForLayers = _.concat(featuresForLayers,_featuresForLayers);
          }
        });
        featuresForLayers = self.handleResponseFeaturesAndRelations(featuresForLayers);
        d.resolve({
          data: featuresForLayers,
          query: {
            coordinates: coordinates
          }
        });
      })
      .fail(function(e){
        d.reject(e);
      });
    }
    else {
      d.resolve(coordinates,0,{});
    }
    return d.promise();
  };
  
  this.doRequestAndParse = function(url,infoFormat,queryLayers){
    var self = this;
    var d = $.Deferred();
    $.get(url).
    done(function(response) {
      var featuresForLayers = self.handleQueryResponseFromServer(response, infoFormat, queryLayers);;
      d.resolve(featuresForLayers);
    })
    .fail(function(){
      d.reject();
    });
    return d;
  };

  //query by BBOX
  this.queryByBoundingBox = function(bbox) {
    //codice qui
  };


  base(this);
}
inherit(QueryService,G3WObject);

module.exports =  new QueryService

