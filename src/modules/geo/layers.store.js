function LayersStore(config){
  var instance = new _store(config);
  
  return {
    getLayers: function(){
      return instance.getLayers();
    },
    getLayersTree: function(){
      return instance.getLayersTree();
    }
  }
};

function _store(config){
  this.layers = config.layers;
  this.layersTree = config.layersTree;
};

_store.prototype.getLayers = function(){
  return this.layers;
};

_store.prototype.getLayersTree = function(){
  return this.layersTree;
};

module.exports = LayersStore;

