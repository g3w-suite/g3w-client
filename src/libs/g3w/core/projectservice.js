var inherit = require('./utils').inherit;
var base = require('./utils').base;
var G3WObject = require('g3w/core/g3wobject');

var ProjectTypes = {
  QDJANGO: 'qdjango',
  OGR: 'ogr'
};

var GeometryTypes = {
  POINT: "Point",
  LINESTRING: "Line",
  POLYGON: "Polygon"
};

function ProjectService(){
  var self = this;
  this.config = null;
  this.layers = {};
  this.state = {
    layerstree: []
  };
  
  this.setters = {
    setLayersVisible: function(layers,visible){
      _.forEach(layers,function(layer){
        self.layers[layer.id].visible = visible;
      })
    }
  };
  
  this.init = function(config){
    this.config = config;
  };
  
  // genera l'oggetto layers (per riferimento), per semplificare gli aggiornamenti dello stato del layerstree
  this.makeLayersObj = function(layerstree){
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
  
  this.setProject = function(project){
    /* struttura oggetto 'project'
    {
      id,
      type,
      gid,
      name,
      crs,
      extent,
      layerstree
    }
    */
    this.state = project;
    this.makeLayersObj(project.layerstree);
    this.emit('projectset');
  };
  
  this.getLayer = function(id){
    return this.layers[id];
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
    return this.config.getWmsUrl(this.state);
  };
  
  this.getLegendUrl = function(layer){
    return this.getWmsUrl(this.state)+'/?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&FORMAT=image/png&LAYERTITLE=False&ITEMFONTSIZE=10&LAYER='+layer.name;
  };
  
  base(this);
};

inherit(ProjectService,G3WObject);

module.exports = {
  ProjectService: new ProjectService,
  ProjectTypes: ProjectTypes,
  GeometryTypes: GeometryTypes
};
