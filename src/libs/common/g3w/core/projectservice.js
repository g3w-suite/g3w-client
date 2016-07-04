var inherit = require('./utils').inherit;
var base = require('./utils').base;
var G3WObject = require('./g3wobject');
var LayerState = require('./layerstate.js');

var ProjectTypes = {
  QDJANGO: 'qdjango',
  OGR: 'ogr'
};

function ProjectService(){
  var self = this;
  this.config = null;
  this.layers = {};
  this.state = {
    project: null,
    baseLayers: []
  };
  
  this.setters = {
    setLayersVisible: function(layers,visible){
      _.forEach(layers,function(layer){
        self.layers[layer.id].visible = visible;
      })
    },
    setBaseLayer: function(id){
      _.forEach(self.state.baseLayers,function(baseLayer){
        baseLayer.visible = (baseLayer.id == id);
      })
    }
  };
  
  this.init = function(config){
    this.config = config;
  };
  
  // genera l'oggetto layers (per riferimento), per semplificare gli aggiornamenti dello stato del layerstree
  this.makeLayersObj = function(layerstree){
    this.layers = {};
    function traverse(obj){
      _.forIn(obj, function (layer, key) {
            //verifica che il valore dell'id non sia nullo
            if (!_.isNil(layer.id)) {
                self.layers[layer.id] = layer;
            }
            if (!_.isNil(layer.nodes)) {
                traverse(layer.nodes);
            }
        });
      };
    traverse(layerstree);
  };
  
  this.getCurrentProject = function(){
    return this.state.project;
  };
  
  this.setProject = function(project,doswitch){
    /* struttura oggetto 'project'
    {
      id,
      type,
      gid,
      name,
      crs,
      extent,
      layerstree,
      widgets
    }
    */
    this.state.project = project;
    this.state.baseLayers = project.baseLayers;
    this.makeLayersObj(project.layerstree);
    var eventType = 'projectset';
    if (doswitch && doswitch === true) {
      eventType = 'projectswitch';
    }
    this.emit(eventType);
  };
  
  this.switchProject = function(project) {
    this.setProject(project,true);
  };
  
  this.getLayer = function(id){
    return this.layers[id];
  };
  
  this.getLayers = function(){
    return this.layers;
  };
  
  this.getLayerById = function(id) {
    var layer = null;
    _.forEach(this.getLayers(),function(_layer){
      if (_layer.id == id){
        layer = _layer;
      }
    });
    return layer;
  };
  
  this.getLayerByName = function(name) {
    var layer = null;
    _.forEach(this.getLayers(),function(_layer){
      if (_layer.name == name){
        layer = _layer;
      }
    });
    return layer;
  };
  
  this.getQueryableLayers = function(){
    var queryableLayers = [];
    _.forEach(this.getLayers(),function(layer){
      if (LayerState.isQueryable(layer)){
        queryableLayers.push(layer);
      }
    });
    return queryableLayers;
  };
  
  this.getLayerAttributes = function(id){
    return this.layers[id].attributes;
  };
  
  this.getLayerAttributeLabel = function(id,name){
    var label = '';
    _.forEach(this.layers[id].attributes,function(attribute){
      if (attribute.name == name){
        label = attribute.label;
      }
    })
    return label;
  };
  
  this.toggleLayer = function(layer,visible){
    var visible = visible || !layer.visible;
    self.setLayersVisible([layer],visible);
  };
  
  this.toggleLayers = function(layers,visible){
    self.setLayersVisible(layers,visible);
  };
  
  this.getWmsUrl = function(){
    return this.config.getWmsUrl(this.state.project);
  };
  
  this.getLegendUrl = function(layer){
    var url = this.getWmsUrl(this.state);
    sep = (url.indexOf('?') > -1) ? '&' : '?';
    return this.getWmsUrl(this.state)+sep+'SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&SLD_VERSION=1.1.0&FORMAT=image/png&TRANSPARENT=true&ITEMFONTCOLOR=white&LAYERTITLE=False&ITEMFONTSIZE=10&LAYER='+layer.name;
  };
  
  base(this);
};

inherit(ProjectService,G3WObject);

module.exports = {
  ProjectService: new ProjectService,
  ProjectTypes: ProjectTypes
};
