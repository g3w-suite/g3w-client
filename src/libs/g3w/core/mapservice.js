var inherit = require('./utils').inherit;
var deferredValue = require('./utils').deferredValue;
var Context = require('g3w/core/context');
var StoreProvider = require('./stateprovider');
var ProjectsRegistry = require('./projectsregistry');
var ProjectService = require('./projectservice');
var ol3helpers = require('g3w-ol3/src/g3w.ol3').helpers;
var MapLayer = require('./maplayer');

function MapService(){
  var self = this;
  this.viewer;
  this.mapLayers = {};
  this.state = {};
  
  ProjectService.on('projectset',function(){
    if (!self.viewer){
      self.setupViewer();
    }
    self.setupLayers();
  });
  
  ProjectService.on('layertoggled',function(layer){
    var mapLayer = self.getMapLayerForLayer(layer);
    mapLayer.toggleLayer(layer);
  });
  
  this.setupViewer = function(config){
    var extent = ProjectService.state.extent;
    var projection = new ol.proj.Projection({
      code: "EPSG:"+ProjectService.state.crs,
      extent: extent
    });
    this.viewer = ol3helpers.createViewer({
      view: {
        projection: projection,
        center: [680484,4849720],
        zoom: 1 
      }
    });
    
    //this.addTestLayer()
  };
  
  this.setupLayers = function(){
    var layersArray = this.traverseLayersTree(ProjectService.state.layersTree);
    layersArray.forEach(function(layerBaseConfig){
      // è un layer vero, non un folder
      if(!_.get(layerBaseConfig,'nodes')){
        // per evitare di interferire con il config originale
        var layer = {};
        _.merge(layer,layerBaseConfig);
        // prendo la definizione completa del layer
        _.merge(layer,ProjectService.state.layers[layer.id]);
        var layerId = 'layer_'+layer.metalayer;
        var mapLayer = _.get(self.mapLayers,layerId);
        if (!mapLayer){
          if (Context.client.local){
            url = owstestproject;
          }
          else{
            url = Context.server.url.ows;
          }
          mapLayer = self.mapLayers[layerId] = new MapLayer({
            id: layerId,
            url: url
          });
          self.viewer.map.addLayer(mapLayer.getOlLayer());
        }
        mapLayer.addLayer(layer);
      }
    });
    
    _.forEach(this.mapLayers,function(mapLayer){
      mapLayer.update();
    })
  };
  
  this.getMapLayerForLayer = function(layer){
    var layer = ProjectService.state.layers[layer.id];
    return this.mapLayers['layer_'+layer.metalayer];
  };
  
  this.traverseLayersTree = function(layersTree){
    var self = this;
    var layersArray = [];
    function traverse(obj){
      _.forIn(obj, function (val, key) {
          if (!_.isNil(val.id)) {
              layersArray.unshift(val);
          }
          if (!_.isNil(val.nodes)) {
              traverse(val.nodes);
          }
      });
    }
    traverse(layersTree);
    return layersArray;
  };
  
  this.addTestLayer = function(){
    var id = ProjectService.state.layersTree[1].nodes[1].id;
    var layerName = ProjectService.state.layers[id].name;
    //this.viewer.addBaseLayer('OSM');
    var layer = new ol.layer.Image({
      name: 'Test',
      opacity: 1.0,
      source: new ol.source.ImageWMS({
        url: owstestproject,
        params: {
          LAYERS: [layerName],
          VERSION: '1.3.0',
          TRANSPARENT: true
        }
      }),
      visible:true
    });
    this.viewer.map.addLayer(layer);
  };
  
  this.showViewer = function(elId){
    this.viewer.setTarget(elId);
  };
};

inherit(ProjectService,StoreProvider);

module.exports = new MapService
