var inherit = require('./utils').inherit;
var StateProvider = require('./stateprovider');

function ProjectService(){
  var self = this;
  this.state = {
    layers: [],
    layersTree: [],
  };
  
  this.makeLayersObj = function(layersConfig){
    // transforma layers array in objects tracked by id
    return _.keyBy(layersConfig,'id');
  };
  
  this.fillLayersTree = function(layersTree){
    var self = this;
    //var _layersTree = _.cloneDeep(layersTree);//crea un clone nuovo dell'array layersTree
    function traverse(obj){
      _.forIn(obj, function (val, key) {
          //verifica che il valore dell'id non sia nullo
          if (!_.isNil(val.id)) {
              // extend layers tree leafs with a direct reference to the layer object
              //aggiungo la proprieta' title che serve a bootstrap-tree per visulaizzare i nomi
              // all'interno del catalog
              val.title = self.state.layers[val.id].title;
          }
          if (!_.isNil(val.nodes)) {
              val.title = val.name;
              // ricorsiva faccio stesso controllo per i nodi del layertree
              traverse(val.nodes);
          }
      });
    }
    traverse(layersTree);
    return layersTree;
  };
  
  this.setProject = function(project){
    this.state.name = project.name;
    this.state.crs = project.crs;
    this.state.extent = project.extent;
    this.state.layers = this.makeLayersObj(project.layers);
    this.state.layersTree = this.fillLayersTree(project.layerstree);
    this.emit('projectset');
  };
  
  this.toggleLayer = function(layerId){
    function traverse(obj){
      _.forIn(obj, function (layer, key) {
            //verifica che il valore dell'id non sia nullo
            if (!_.isNil(layer.id) && layer.id == layerId) {
                layer.visible = !layer.visible;
                self.emit('layertoggled',layer);
            }
            if (!_.isNil(layer.nodes)) {
                traverse(layer.nodes);
            }
        });
      };
    traverse(this.state.layersTree);
  };
};

inherit(ProjectService,StateProvider);

module.exports = new ProjectService
