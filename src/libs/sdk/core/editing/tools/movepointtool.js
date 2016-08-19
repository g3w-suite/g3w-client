var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;

var EditingTool = require('./editingtool');

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
  
  base(this,editor);
}
inherit(MoveFeatureTool,EditingTool);
module.exports = MoveFeatureTool;

var proto = MoveFeatureTool.prototype;

proto.run = function(){
  var self = this;
  this.layer = this.editor.getVectorLayer().getLayer();
  this.editingLayer = this.editor.getEditVectorLayer().getLayer();
  
  this._selectInteraction = new ol.interaction.Select({
    layers: [this.layer,this.editingLayer],
    condition: ol.events.condition.click
  });
  this.addInteraction(this._selectInteraction);
  
  this._translateInteraction = new ol.interaction.Translate({
    features: this._selectInteraction.getFeatures()
  });
  this.addInteraction(this._translateInteraction);
  
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
  this._selectInteraction.getFeatures().clear();
  this.removeInteraction(this._selectInteraction);
  this._selectInteraction = null;
  this.removeInteraction(this._translateInteraction);
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
