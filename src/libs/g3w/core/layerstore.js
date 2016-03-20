/* costruttore di oggetto che ritorna due metodi:
   getLayers : ritorna array layers del file di configurazione
   getLayersTree : ritorna array layerstree del file di configurazione
   prende come parametro un oggetto contentente proprieta layers e layersTree che non e' altro che
   le proprieta layers e layerstree dell'oggetto configurazione passato dal server
*/
function LayersStore(config){
  // Private local instance
  var instance = new _store(config);
  //ritorna array layers
  this.getLayers = function(){
    return instance.getLayers();
  };
  //ritorna array layerstree
  this.getLayersTree =function(){
    return instance.getLayersTree();
  };
}

function _store(config){
  var layers = this.makeLayersObj(config.layers); // oggetto dove le chiavi sono i nomi dei layers
  var layersTree = this.fillLayersTree(config.layerstree, layers);
  this.layers = layers;
  this.layersTree = layersTree;
}

_store.prototype.makeLayersObj = function(layersConfig){
  // transforma layers array in objects tracked by id
  return _.keyBy(layersConfig,'id');
};

_store.prototype.fillLayersTree = function(layersTree,layers){
  var _layersTree = _.cloneDeep(layersTree);//crea un clone nuovo dell'array layersTree
  function traverse(obj){
    _.forIn(obj, function (val, key) {
        //verifica che il valore dell'id non sia nullo
        if (!_.isNil(val.id)) {
            // extend layers tree leafs with a direct reference to the layer object
            //aggiungo la proprieta' title che serve a bootstrap-tree per visulaizzare i nomi
            // all'interno del catalog
            val.title = layers[val.id].title;
        }
        if (!_.isNil(val.nodes)) {
            val.title = val.name;
            // ricorsiva faccio stesso controllo per i nodi del layertree
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

