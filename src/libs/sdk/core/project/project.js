var inherit = require('core/utils/utils').inherit;
var base = require('core/utils//utils').base;
var G3WObject = require('core/g3wobject');
var ApplicationService = require('core/applicationservice');

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
    _.forIn(obj, function (layer, key) {
        //verifica che il valore dell'id non sia nullo
        if (!_.isNil(layer.id)) {
            self._layers[layer.id] = layer;
        }
        if (!_.isNil(layer.nodes)) {
            traverse(layer.nodes);
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
    setLayersVisible: function(layers,visible){
      _.forEach(layers,function(layer){
        self._layers[layer.id].visible = visible;
      })
    },
    setBaseLayer: function(id){
      _.forEach(self.state.baseLayers,function(baseLayer){
        baseLayer.visible = (baseLayer.id == id);
      })
    },
    setLayerSelected: function(layer){
      _.forEach(this._layers,function(_layer){
        _layer.selected = (layer.id == _layer.id);
      })
    }
  };

  base(this);
}
inherit(Project,G3WObject);

var proto = Project.prototype;

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
    if (_layer.id == id){
      layer = _layer;
    }
  });
  return layer;
};

proto.getLayerByName = function(name) {
  var layer = null;
  _.forEach(this.getLayers(),function(_layer){
    if (_layer.name == name){
      layer = _layer;
    }
  });
  return layer;
};

proto.getQueryableLayers = function(){
  var queryableLayers = [];
  _.forEach(this.getLayers(),function(layer){
    if (LayerState.isQueryable(layer)){
      queryableLayers.push(layer);
    }
  });
  return queryableLayers;
};

proto.getLayerAttributes = function(id){
  return this._layers[id].attributes;
};

proto.getLayerAttributeLabel = function(id,name){
  var label = '';
  _.forEach(this._layers[id].attributes,function(attribute){
    if (attribute.name == name){
      label = attribute.label;
    }
  })
  return label;
};

proto.toggleLayer = function(layer,visible){
  var visible = visible || !layer.visible;
  this.setLayersVisible([layer],visible);
};

proto.toggleLayers = function(layers,visible){
  this.setLayersVisible(layers,visible);
};

proto.selectLayer = function(layer){
  this.setLayerSelected(layer);
};

proto.setGetWmsUrl = function(getWmsUrlFnc){
  this._getWmsUrlFnc = getWmsUrlFnc;
};

proto.getWmsUrl = function(){
  return this._getWmsUrlFnc(this.state);
};

proto.getLegendUrl = function(layer){
  var url = this.getWmsUrl();
  sep = (url.indexOf('?') > -1) ? '&' : '?';
  return this.getWmsUrl()+sep+'SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&SLD_VERSION=1.1.0&FORMAT=image/png&TRANSPARENT=true&ITEMFONTCOLOR=white&LAYERTITLE=False&ITEMFONTSIZE=10&LAYER='+layer.name;
};

module.exports = Project;
