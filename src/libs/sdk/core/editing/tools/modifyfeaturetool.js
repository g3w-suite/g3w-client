var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

var EditingTool = require('./editingtool');

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
  
  base(this,editor);
}
inherit(ModifyFeatureTool,EditingTool);
module.exports = ModifyFeatureTool;

var proto = ModifyFeatureTool.prototype;

proto.run = function(){
  var self = this;
  this.layer = this.editor.getVectorLayer().getMapLayer();
  this.editingLayer = this.editor.getEditVectorLayer().getMapLayer();
  
  this._selectInteraction = new ol.interaction.Select({
    layers: [this.layer,this.editingLayer],
  });
  this.addInteraction(this._selectInteraction);
  
  this._modifyInteraction = new ol.interaction.Modify({
    features: this._selectInteraction.getFeatures(),
    deleteCondition: this._deleteCondition,
  });
  this.addInteraction(this._modifyInteraction);
  
  var origGeometry = null;
  
  this._modifyInteraction.on('modifystart',function(e){
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
  });
  
  if (this._snap){
    this._snapInteraction = new ol.interaction.Snap({
      source: this._snap.vectorLayer.getSource()
    });
    this.addInteraction(this._snapInteraction);
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
  this._selectInteraction.getFeatures().clear();
  if (this._snapInteraction){
     this.removeInteraction(this._snapInteraction);
     this._snapInteraction = null;
  }
  this.removeInteraction(this._selectInteraction);
  this._selectInteraction = null;
  this.removeInteraction(this._modifyInteraction);
  this._modifyInteraction = null;
  return true;
};

proto._modifyFeature = function(feature,isNew){
  // aggionro la geometria nel buffer di editing
  this.editor.updateFeature(feature,isNew);
  this._selectInteraction.getFeatures().clear();
  this._busy = false;
  this.pause(false);
  return true;
};

proto.removePoint = function(coordinate){
  if (this._modifyInteraction){
    // provo a rimuovere l'ultimo punto. Nel caso non esista la geometria gestisco silenziosamente l'errore
    try{
      this._modifyInteraction.removePoint();
    }
    catch (e){
      console.log(e);
    }
  }
};

proto._fallBack = function(feature){
  this._busy = false;
  this.pause(false);
};

proto._isNew = function(feature){
  return (!_.isNil(this.editingLayer.getSource().getFeatureById(feature.getId())));
};
