var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var GUI = require('gui/gui');
var G3WObject = require('core/g3wobject');
var ComponentsRegistry = require('gui/componentsregistry');

function QueryResultsService(){
  var self = this;
  this._actions = {
    'zoomto': QueryResultsService.zoomToElement,
    'gotogeometry': QueryResultsService.goToGeometry,
    'highlightgeometry': QueryResultsService.highlightGeometry,
    'clearHighlightGeometry': QueryResultsService.clearHighlightGeometry
  };
  
  this.init = function(options) {
    this.clearState();
  };
  
  this.state = {
    layers: [],
    query: {},
    querytitle: null,
    loading: true
  };
  
  this.setters = {
    setQueryResponse: function(queryResponse,coordinates,resolution) {
      this.state.layers = [];
      this.state.query = queryResponse.query;
      var layers = this._digestFeaturesForLayers(queryResponse.data)
      this.setLayersData(layers,this);
    },
    setLayersData: function(layers,self) {
      this.state.loading = false;
      this.state.layers =  layers;
      this.setActionsForFeatures(layers);
    },
    setActionsForFeatures: function(layers) {
      // define actions for layers/features
    }
  };
  
  this.clearState = function() {
    this.state = {
      layers: [],
      query: {},
      querytitle: "",
      loading: true
    };
  };
  
  this.setTitle = function(querytitle) {
    this.state.querytitle = querytitle || "";
  };
  
  this.reset = function() {
    this.clearState();
  };
  // funzione che serve a far digerire i risultati delle features
  this._digestFeaturesForLayers = function(featuresForLayers) {
    var self = this;
    var id = 0;
    var layers = [];
    _.forEach(featuresForLayers, function(featuresForLayer) {
      var layer = featuresForLayer.layer;
      if (featuresForLayer.features.length) {
        var layerObj = {
          title: layer.state.title,
          id: layer.state.id,
          // prendo solo gli attributi effettivamente ritornati dal WMS (usando la prima feature disponibile)
          attributes: self._parseAttributes(layer.getAttributes(), featuresForLayer.features[0].getProperties()),
          features: [],
          hasgeometry: false,
          show: true
        };
        _.forEach(featuresForLayer.features, function(feature){
          var fid = feature.getId() ? feature.getId() : id;
          var geometry = feature.getGeometry();
          if (geometry) {
            layerObj.hasgeometry = true
          }
          var featureObj = {
            id: fid,
            attributes: feature.getProperties(),
            geometry: feature.getGeometry(),
            show: true
            // aggiungo le relazioni
          };
          //console.log(featureObj);
          layerObj.features.push(featureObj);
        });
        layers.push(layerObj);
      }
      id += 1;
    })
    return layers;
  };
  
  this._parseAttributes = function(layerAttributes, featureAttributes) {
    var featureAttributesNames = _.keys(featureAttributes);

    featureAttributesNames = _.filter(featureAttributesNames,function(featureAttributesName){
      return ['boundedBy','geom','the_geom','geometry','bbox'].indexOf(featureAttributesName) == -1;
    });

    if (layerAttributes && layerAttributes.length) {
      var featureAttributesNames = _.keys(featureAttributes);
      return _.filter(layerAttributes,function(attribute){
        return featureAttributesNames.indexOf(attribute.name) > -1;
      })
    }
    // se layer.attributes è vuoto
    // (es. quando l'interrogazione è verso un layer esterno di cui non so i campi)
    // costruisco la struttura "fittizia" usando l'attributo sia come name che come label
    else {
      return _.map(featureAttributesNames, function(featureAttributesName){
        return {
          name: featureAttributesName,
          label: featureAttributesName
        }
      })
    }
  };
  
  this.trigger = function(action,layer,feature) {
    var actionMethod = this._actions[action];
    if (actionMethod) {
      actionMethod(layer,feature);
    }
  };
  
  base(this);
}
QueryResultsService.zoomToElement = function(layer,feature) {

};

QueryResultsService.goToGeometry = function(layer,feature) {
  if (feature.geometry) {
    GUI.hideQueryResults();
    var mapService = ComponentsRegistry.getComponent('map').getService();
    mapService.highlightGeometry(feature.geometry,{duration: 4000});
  }
};

QueryResultsService.highlightGeometry = function(layer,feature) {
  if (feature.geometry) {
    var mapService = ComponentsRegistry.getComponent('map').getService();
    mapService.highlightGeometry(feature.geometry,{zoom: false});
  }
};

QueryResultsService.clearHighlightGeometry = function(layer,feature) {
  var mapService = ComponentsRegistry.getComponent('map').getService();
  mapService.clearHighlightGeometry();
};

// Make the public service en Event Emitter
inherit(QueryResultsService, G3WObject);

module.exports = QueryResultsService;
