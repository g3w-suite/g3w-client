var inherit = require('./utils').inherit;
var StoreProvider = require('./storeprovider');

function ProjectService(){
  this.store = {
    layers: [],
    layersTree: []
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
              val.title = self.store.layers[val.id].title;
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
    this.store.layers = this.makeLayersObj(project.layers);
    this.store.layersTree = this.fillLayersTree(project.layerstree);
  };
};

inherit(ProjectService,StoreProvider);

module.exports = new ProjectService
