var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var G3WObject = require('g3w/core/g3wobject');

var MapService = require('g3w/core/mapservice');

function DeleteFeatureTool(editor){
  var self = this;
  this.editor = editor;
  this.isPausable = true;
  this.drawInteraction = null;
  this.layer = null;
  this.editingLayer = null;

  this.setters = {
    deleteFeature: {
      fnc: DeleteFeatureTool.prototype._moveFeature,
      fallback: DeleteFeatureTool.prototype._fallBack
    }
  };
  
  base(this);
}
inherit(DeleteFeatureTool,G3WObject);
module.exports = DeleteFeatureTool;

var proto = DeleteFeatureTool.prototype;

proto.run = function(){
  var self = this;
  var map = MapService.viewer.map;
  this.layer = this.editor.getVectorLayer().getLayer();
  this.editingLayer = this.editor.getEditVectorLayer().getLayer();
  
  this._selectInteraction = new ol.interaction.Select({
    layers: [this.layer,this.editingLayer],
    condition: ol.events.condition.click
  });
  map.addInteraction(this._selectInteraction);
  
  this._translateInteraction = new ol.interaction.Translate({
    features: this._selectInteraction.getFeatures()
  });
  map.addInteraction(this._translateInteraction);
  
  var origGeometry = null;
  
  this._translateInteraction.on('translatestart',function(e){
    var feature = e.features.getArray()[0];
    origGeometry = feature.getGeometry();
  });
  
  this._translateInteraction.on('translateend',function(e){
    var feature = e.features.getArray()[0];
    var isNew = self._isNew(feature);
    try {
      if (!self._busy){
        self._busy = true;
        self.pause();
        self.moveFeature(feature,isNew)
        .then(function(res){
          self.pause(false);
        })
        .fail(function(){
          feature.setGeometry(origGeometry);
        });
      }
    }
    catch (error){
      console.log(error);
      feature.setGeometry(origGeometry);
    }
  });

};

proto.pause = function(pause){
  if (_.isUndefined(pause) || pause){
    this._selectInteraction.setActive(false);
    this._translateInteraction.setActive(false);
  }
  else {
    this._selectInteraction.setActive(true);
    this._translateInteraction.setActive(true);
  }
};

proto.stop = function(){
  var map = MapService.viewer.map;
  this._selectInteraction.getFeatures().clear();
  map.removeInteraction(this._selectInteraction);
  map.removeInteraction(this._translateInteraction);
  return true;
};

proto._moveFeature = function(feature,isNew){
  this.editor.updateFeature(feature,isNew);
  this._busy = false;
  this.pause(false);
  return true;
};

proto._fallBack = function(feature){
  this._busy = false;
  this.pause(false);
};

proto._isNew = function(feature){
  return (!_.isNil(this.editingLayer.getSource().getFeatureById(feature.getId())));
};
