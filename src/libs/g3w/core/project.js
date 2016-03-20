var LayerStore = require('g3w/core/layerstore');

/*
var layersStore = new LayersStore({
  layers: projectConfig.layers,
  layersTree: projectConfig.layerstree
});
*/

function Project(options){
  var _project = new _Project(options);
  this.gid = _project.gid;
  
  this.getLayersTree = function(){
    var tree = _project.store.getLayersTree();
    return _project.store.getLayersTree();
  }
}

function _Project(options){
  this.options = options;
  this.gid = options.gid;
  this.store = new LayerStore(options);
}

module.exports = Project;
