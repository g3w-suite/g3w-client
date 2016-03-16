function LayersStore(config){
  // Private local instance
  var instance = new _store(config);
  
  this.getLayers = function(){
    return instance.getLayers();
  };
  this.getLayersTree =function(){
    return instance.getLayersTree();
  };
}

function _store(config){
  this.layers = config.layers;
  this.layersTree = config.layersTree;
}

_store.prototype.getLayers = function(){
  return this.layers;
};

_store.prototype.getLayersTree = function(){
  return this.layersTree;
};

module.exports = LayersStore;

