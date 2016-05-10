var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var G3WObject = require('g3w/core/g3wobject');

var MapService = require('g3w/core/mapservice');

function MoveFeatureTool(editor){
  var self = this;
  this.editor = editor;
  this.isPausable = true;
  this.drawInteraction = null;
  this.layer = null;
  this.editingLayer = null;
  
  this._origGeometry = null;

  this.setters = {
    moveFeature: {
      fnc: MoveFeatureTool.prototype._moveFeature,
      fallback: MoveFeatureTool.prototype._fallBack
    }
  };
  
  base(this);
}
inherit(MoveFeatureTool,G3WObject);
module.exports = MoveFeatureTool;

var proto = MoveFeatureTool.prototype;

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
  
  this._translateInteraction.on('translatestart',function(e){
    var feature = e.features.getArray()[0];
    self._origGeometry = feature.getGeometry().clone();
    self.editor.emit('movestart',feature);
  });
  
  this._translateInteraction.on('translateend',function(e){
    var feature = e.features.getArray()[0];
    //try {
      if (!self._busy){
        self._busy = true;
        self.pause();
        self.moveFeature(feature)
        .then(function(res){
          self.pause(false);
        })
        .fail(function(){
          feature.setGeometry(self._origGeometry);
        });
      }
    //}
    /*catch (error){
      console.log(error);
      feature.setGeometry(self._origGeometry);
    }*/
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
  this._selectInteraction = null;
  map.removeInteraction(this._translateInteraction);
  this._translateInteraction = null;
  return true;
};

proto._moveFeature = function(feature){
  this.editor.emit('moveend',feature);
  this.editor.updateFeature(feature);
  this._selectInteraction.getFeatures().clear();
  this._busy = false;
  this.pause(false);
  return true;
};

proto._fallBack = function(feature){
  this._busy = false;
  this.pause(false);
};
