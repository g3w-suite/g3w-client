var inherit = require('core/utils/utils').inherit;
var base = require('core/utils//utils').base;
var G3WObject = require('core/g3wobject');
var ApplicationService = require('core/applicationservice');

var ProjectLayer = require('./projectlayer');

function Project(projectConfig) {
  var self = this;
  
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
  this.state = projectConfig;
  
  this._layers = {};
  function traverse(obj){
    _.forIn(obj, function (layerConfig, key) {
        //verifica che il valore dell'id non sia nullo
        if (!_.isNil(layerConfig.id)) {
            var layer = self.buildProjectLayer(layerConfig);
            self._layers[layer.getId()] = layer;
        }
        if (!_.isNil(layerConfig.nodes)) {
            traverse(layerConfig.nodes);
        }
    });
  }
  traverse(projectConfig.layerstree);
  
  /*var eventType = 'projectset';
  if (doswitch && doswitch === true) {
    eventType = 'projectswitch';
  }
  this.emit(eventType);*/
  
  this.setters = {
    setLayersVisible: function(layersIds,visible){
      _.forEach(layersIds,function(layerId){
        self.getLayerById(layerId).state.visible = visible;
      })
    },
    setBaseLayer: function(id){
      _.forEach(self.state.baseLayers,function(baseLayer){
        baseLayer.visible = (baseLayer.id == id);
      })
    },
    setLayerSelected: function(layerId,selected){
      _.forEach(this._layers,function(_layer){
        _layer.state.selected = (layerId == layer.state.id);
      })
    }
  };

  base(this);
}
inherit(Project,G3WObject);

var proto = Project.prototype;

proto.buildProjectLayer = function(layerConfig) {
  var layer = new ProjectLayer(layerConfig);
  layer.setProject(this);
  
  // aggiungo proprietà non ottenute dalla consfigurazione
  layer.state.selected = false;
  layer.state.disabled = false;
  
  return layer;
};

proto.getGid = function() {
  return this.state.gid;
}

proto.getLayer = function(id){
  return this._layers[id];
};

proto.getLayers = function(){
  return this._layers;
};

proto.getLayerById = function(id) {
  var layer = null;
  _.forEach(this.getLayers(),function(_layer){
    if (_layer.state.id == id){
      layer = _layer;
    }
  });
  return layer;
};

proto.getLayerByName = function(name) {
  var layer = null;
  _.forEach(this.getLayers(),function(layer){
    if (layer.state.name == name){
      layer = _layer;
    }
  });
  return layer;
};

proto.getQueryableLayers = function(){
  var queryableLayers = [];
  _.forEach(this.getLayers(),function(layer){
    if (layer.isQueryable()){
      queryableLayers.push(layer);
    }
  });
  return queryableLayers;
};

proto.getLayerAttributes = function(id){
  return this._layers[id].state.attributes;
};

proto.getLayerAttributeLabel = function(layerId,name){
  var label = '';
  _.forEach(this.getLayerById(layerId).state.attributes,function(attribute){
    if (attribute.name == name){
      label = attribute.label;
    }
  })
  return label;
};

proto.toggleLayer = function(layerId,visible){
  var layer = this.getLayerById(layerId);
  var visible = visible || !layer.state.visible;
  this.setLayersVisible([layerId],visible);
};

proto.toggleLayers = function(layersIds,visible){
  this.setLayersVisible(layersIds,visible);
};

proto.selectLayer = function(layerId){
  this.setLayerSelected(layerId,true);
};

proto.unselectLayer = function(layerId) {
  this.setLayerSelected(layerId,false);
}

proto.getSelectedLayers = function() {
  var selectedLayers = [];
  _.forEach(this.getLayers(),function(_layer){
    if (_layer.selected) {
      selectedLayers.push(_layer);
    }
  });
  return selectedLayers;
}

/*proto.setGetWmsUrl = function(getWmsUrlFnc){
  this._getWmsUrlFnc = getWmsUrlFnc;
};

proto.getWmsUrl = function(){
  return this._getWmsUrlFnc(this.state);
};*/

proto.getInfoFormat = function() {
  return 'application/vnd.ogc.gml';
};

proto.getWmsUrl = function(){
  return this.state.WMSUrl;
};

proto.getLegendUrl = function(layer){
  var url = this.getWmsUrl();
  sep = (url.indexOf('?') > -1) ? '&' : '?';
  return this.getWmsUrl()+sep+'SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&SLD_VERSION=1.1.0&FORMAT=image/png&TRANSPARENT=true&ITEMFONTCOLOR=white&LAYERTITLE=False&ITEMFONTSIZE=10&LAYER='+layer.name;
};

module.exports = Project;
