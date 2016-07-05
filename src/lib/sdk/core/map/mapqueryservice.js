var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var Geometry = require('core/geometry/geometry');
var ProjectService = require('core/project/projectservice').ProjectService;

//var GUI = require('gui/gui'); // QUESTO NON CI DEVE ESSERE!!!

function MapQueryService() {
  base(this);
  
  this.init = function(map){
    this.map = map;
  }
  
  this.queryPoint = function(coordinates,mapLayers) {
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
        //var mapLayerLayersNames = mapLayer.getLayer().getSource().getParams()['LAYERS'];
        //layerNames = _.concat(layerNames,mapLayerLayersNames);
        var mapLayerQueryLayers = mapLayer.getQueryLayers();
        
        if (mapLayerQueryLayers.length) {
          queryLayers = _.concat(queryLayers,mapLayerQueryLayers);
        }
      })
      
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
        getFeatureInfoUrl = queryBase+'?'+newQueryPairs.join('&')
        
        queryUrlsForLayers.push({
          url: getFeatureInfoUrl,
          queryLayers: queryLayers
        });
      }
    })
    
    var featuresForLayerNames = {};
    if (queryUrlsForLayers.length > 0) {
      _.forEach(queryUrlsForLayers,function(queryUrlForLayers){
        var url = queryUrlForLayers.url;
        var queryLayers = queryUrlForLayers.queryLayers;

        $.get(url).
        then(function(response){
          var jsonresponse;
          var x2js = new X2JS();
          try {
            if (_.isString(response)) {
              jsonresponse = x2js.xml_str2json(response);
            }
            else {
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
              parser = self._parseLayerFeatureCollection;
              data = jsonresponse;
              break;
            case "msGMLOutput":
              parser = self._parseLayermsGMLOutput;
              data = response;
              break;
          }
          var nfeatures = 0
          _.forEach(queryLayers,function(queryLayer){
            var features = parser.call(self,queryLayer,data)
            nfeatures += features.length;
            featuresForLayerNames[queryLayer.layerName] = features;
          })
          d.resolve(coordinates,nfeatures,featuresForLayerNames);
        })
        .fail(function(e){
          d.reject(e);
        })
      });
    }
    else {
      d.resolve(coordinates,0,featuresForLayerNames);
    }
    
    return d.promise();
  };
  
  // Brutto ma per ora unica soluzione trovata per dividere per layer i risultati di un doc xml wfs.FeatureCollection. OL3 li parserizza tutti insieme...
  this._parseLayerFeatureCollection = function(queryLayer,data){
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
  this._parseLayermsGMLOutput = function(queryLayer,data){
    var parser = new ol.format.WMSGetFeatureInfo({
      layers: [queryLayer.queryLayerName]
    });
    return parser.readFeatures(data);
  };
  
  this.queryRect = function(rect,layerId) {
    
  };
  
  this._query = function(rect,layerId) {
    var layers;
    if (layerId) {
      layers = [ProjectService.getLayer(layerId)];
    }
    else {
      layers = ProjectService.getLayers();
    }
  };
  
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
}
inherit(MapQueryService,G3WObject);

module.exports = new MapQueryService;
