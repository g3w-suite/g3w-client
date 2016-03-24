var inherit = require('./utils').inherit;
var StoreProvider = require('./stateprovider');
var ProjectsRegistry = require('g3w/core/projectsregistry');
var ProjectService = require('g3w/core/projectservice');
var ol3helpers = require('g3w-ol3/src/g3w.ol3').helpers;

function MapService(){
  var self = this;
  this.viewer;
  this.state = {};
  
  ProjectService.on('projectset',function(){
    self.setupViewer();
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
    
    this.addTestLayer()
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
