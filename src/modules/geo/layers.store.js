function LayersStore(config){
  // Private local instance
  var instance = new _store(config);
  
  this.getLayers = function(){
    return instance.getLayers();
  };
  this.getLayersTree =function(){
    return instance.getLayersTree();
  };
  
  /* test inserimento nuovo layer e cambiamento automatico nel catalog panel
  setTimeout(function(){
    instance.layersTree.push({});
  },5000)
  */
}

function _store(config){
  var layers = this.makeLayersObj(config.layers);
  var layersTree = this.fillLayersTree(config.layersTree, layers);
  this.layers = layers;
  this.layersTree = layersTree;
};

_store.prototype.makeLayersObj = function(layersConfig){
  // transform layers array to objects tracked by id
  return _.keyBy(layersConfig,'id');
};

_store.prototype.fillLayersTree = function(layersTree,layers){
  var _layersTree = _.cloneDeep(layersTree);
  function traverse(obj){
    _.forIn(obj, function (val, key) {
        if (!_.isNil(val.id)) {
            // extend layers tree leafs with a direct reference to the layer object
            val['text'] = layers[val.id].title;
            
        }
        if (!_.isNil(val.nodes)) {
            val['text'] = val.name;
            traverse(val.nodes);
        }
    });
  }
  traverse(_layersTree);
  return _layersTree;
};

_store.prototype.getLayers = function(){
  return this.layers;
};

_store.prototype.getLayersTree = function(){
  return this.layersTree;
};

module.exports = LayersStore;

