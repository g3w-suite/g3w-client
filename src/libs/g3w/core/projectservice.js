var inherit = require('./utils').inherit;
var StateProvider = require('./stateprovider');

function ProjectService(){
  var self = this;
  this.config = null;
  this.layers = {};
  this.state = {
    layerstree: []
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
  
  var setters = {
    setLayersVisible: function(layers,visible){
      _.forEach(layers,function(layer){
        self.layers[layer.id].visible = visible;
      })
    }
  };
  
  this.initSetters(setters);
  
  this.getLayer = function(id){
    return this.layers[id];
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
    return this.getWmsUrl(this.state)+'?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&FORMAT=image/png&LAYERTITLE=False&ITEMFONTSIZE=10&LAYER='+layer.name;
  };
};

inherit(ProjectService,StateProvider);

module.exports = new ProjectService
