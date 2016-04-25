var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var G3WObject = require('g3w/core/g3wobject');
var MapService = require('g3w/core/mapservice');

function ModifyFeatureTool(editor,options){
  var self = this;
  this.editor = editor;
  this.isPausable = true;
  this.drawInteraction = null;
  this.layer = null;
  this.editingLayer = null;
  this._deleteCondition = options.deleteCondition || undefined;
  this._snap = options.snap || null;
  this._snapInteraction = null; 

  this.setters = {
    modifyFeature: ModifyFeatureTool.prototype._modifyFeature
  };
  
  base(this);
}
inherit(ModifyFeatureTool,G3WObject);
module.exports = ModifyFeatureTool;

var proto = ModifyFeatureTool.prototype;

proto.run = function(){
  var self = this;
  var map = MapService.viewer.map;
  this.layer = this.editor.getVectorLayer().getLayer();
  this.editingLayer = this.editor.getEditVectorLayer().getLayer();
  
  this._selectInteraction = new ol.interaction.Select({
    layers: [this.layer,this.editingLayer],
  });
  map.addInteraction(this._selectInteraction);
  
  this._modifyInteraction = new ol.interaction.Modify({
    features: this._selectInteraction.getFeatures(),
    deleteCondition: this._deleteCondition,
  });
  map.addInteraction(this._modifyInteraction);
  
  var origGeometry = null;
  
  this._modifyInteraction.on('modifystart',function(e){
    console.log("modifystart");
    var feature = e.features.getArray()[0];
    origGeometry = feature.getGeometry().clone();
  });
  
  this._modifyInteraction.on('modifyend',function(e){
    var feature = e.features.getArray()[0];
    var isNew = self._isNew(feature);
    //try {
      if (!self._busy){
        self._busy = true;
        self.pause(true);
        self.modifyFeature(feature,isNew)
        .fail(function(){
          feature.setGeometry(origGeometry);
        })
        .always(function(){
          self._busy = false;
          self.pause(false);
        })
      }
    //}
    //catch (error){
    //  console.log(error);
    //  feature.setGeometry(origGeometry);
    //}
  });
  
  if (this._snap){
    this._snapInteraction = new ol.interaction.Snap({
      source: this._snap.vectorLayer.getSource()
    });
    map.addInteraction(this._snapInteraction);
  }
};

proto.pause = function(pause){
  if (_.isUndefined(pause) || pause){
    if (this._snapInteraction){
      this._snapInteraction.setActive(false);
    }
    this._selectInteraction.setActive(false);
    this._modifyInteraction.setActive(false);
  }
  else {
    if (this._snapInteraction){
      this._snapInteraction.setActive(true);
    }
    this._selectInteraction.setActive(true);
    this._modifyInteraction.setActive(true);
  }
};

proto.stop = function(){
  var map = MapService.viewer.map;
  this._selectInteraction.getFeatures().clear();
  if (this._snapInteraction){
     map.removeInteraction(this._snapInteraction);
  }
  map.removeInteraction(this._selectInteraction);
  map.removeInteraction(this._modifyInteraction);
  return true;
};

proto._modifyFeature = function(feature,isNew){
  this.editor.updateFeature(feature,isNew);
  this._selectInteraction.getFeatures().clear();
  this._busy = false;
  this.pause(false);
  return true;
};

proto.removePoint = function(coordinate){
  
};

proto._fallBack = function(feature){
  this._busy = false;
  this.pause(false);
};

proto._isNew = function(feature){
  return (!_.isNil(this.editingLayer.getSource().getFeatureById(feature.getId())));
};
