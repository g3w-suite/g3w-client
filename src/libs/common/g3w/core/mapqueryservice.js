var inherit = require('./utils').inherit;
var base = require('./utils').base;
var G3WObject = require('./g3wobject');
var GUI = require('../gui/gui');
var ProjectService = require('./projectservice').ProjectService;

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
          var nfeatures = 0
          _.forEach(queryLayers,function(queryLayer){
            var parser = new ol.format.WMSGetFeatureInfo({
              layers: [queryLayer.queryLayerName]
            });
            var features = parser.readFeatures(response);
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
