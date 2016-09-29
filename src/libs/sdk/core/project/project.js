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
    initextent,
    layerstree,
    overviewprojectgid
  }
  */
  this.state = projectConfig;
  
  this._layers = {};
  function traverse(obj){
    _.forIn(obj, function (layerConfig, key) {
        //verifica che il valore dell'id non sia nullo
        if (!_.isNil(layerConfig.id)) {
            //costruisco il project layer per ogni layer
            var layer = self.buildProjectLayer(layerConfig);
            self._layers[layer.getId()] = layer;
        }
        if (!_.isNil(layerConfig.nodes)) {
            traverse(layerConfig.nodes);
        }
    });
  }
  traverse(projectConfig.layerstree);

  
  this.setters = {
    setLayersVisible: function(layersIds,visible){
      _.forEach(layersIds,function(layerId){
        self.getLayerById(layerId).state.visible = visible;
      })
    },
    setBaseLayer: function(id){
      _.forEach(self.state.baselayers,function(baseLayer){
        baseLayer.visible = (baseLayer.id == id || (baseLayer.fixed === true));
      })
    },
    setLayerSelected: function(layerId,selected){
      _.forEach(this._layers,function(layer){
        layer.state.selected = ((layerId == layer.state.id) && selected) || false;
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
// funzione che ritorna id
proto.getId = function() {
  return this.state.id;
};

//funzione che ritorna il tipo
proto.getType = function() {
  return this.state.type;
};

proto.getGid = function() {
  return this.state.gid;
};

proto.getOverviewProjectGid = function() {
  return this.state.overviewprojectgid.gid;
};

proto.getLayersDict = function(options){
  var options = options || {};

  var filterQueryable = options.QUERYABLE;

  var filterVisible = options.VISIBLE;

  var filterSelected = options.SELECTED;
  var filterSelectedOrAll = options.SELECTEDORALL;

  if (filterSelectedOrAll) {
    filterSelected = null;
  }

  if (_.isUndefined(filterQueryable) && _.isUndefined(filterVisible) && _.isUndefined(filterSelected) && _.isUndefined(filterSelectedOrAll)) {
    return this._layers;
  }
  
  var layers = this._layers;
  
  if (filterQueryable) {
    layers = _.filter(layers,function(layer){
      return filterQueryable && layer.isQueryable();
    });
  }
  
  if (filterVisible) {
    layers = _.filter(layers,function(layer){
      return filterVisible && layer.isVisible();
    });
  }
  
  if (filterSelected) {
    layers = _.filter(layers,function(layer){
      return filterSelected && layer.isSelected();
    });
  }
  
  if (filterSelectedOrAll) {
    var _layers = layers;
    layers = _.filter(layers,function(layer){
      return layer.isSelected();
    });
    layers = layers.length ? layers : _layers;
  }
  
  return layers;
};

// ritorna l'array dei layers (con opzioni di ricerca)
proto.getLayers = function(options) {
  var layers = this.getLayersDict(options);
  return _.values(layers);
};

proto.getLayerById = function(layerId) {
  return this.getLayersDict()[layerId];
};

proto.getLayerByName = function(name) {
  var layer = null;
  _.forEach(this.getLayers(),function(layer){
    if (layer.getName() == name){
      layer = _layer;
    }
  });
  return layer;
};

proto.getLayerAttributes = function(layerId){
  return this.getLayerById(layerId).getAttributes();
};

proto.getLayerAttributeLabel = function(layerId,name){
  return this.getLayerById(layerId).getAttributeLabel(name);
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
};

proto.getCrs = function() {
  return this.state.crs;
};

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
