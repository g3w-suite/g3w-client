var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var noop = require('core/utils/utils').noop;
var PickFeatureInteraction = require('g3w-ol3/src/interactions/pickfeatureinteraction');

var EditingTool = require('./editingtool');

function PickFeatureTool(editor){
  var self = this;
  this.isPausable = true;
  this.pickFeatureInteraction = null;
  this._running = false;
  this._busy = false;
  
  // qui si definiscono i metodi che vogliamo poter intercettare, ed eventualmente bloccare (vedi API G3WObject)
  this.setters = {
    pickFeature: {
      fnc: noop,
      fallback: PickFeatureTool.prototype._fallBack
    },
  };
  
  base(this,editor);
}
inherit(PickFeatureTool,EditingTool);
module.exports = PickFeatureTool;

var proto = PickFeatureTool.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(){
  var self = this;
  //var map = MapService.viewer.map;
  var layers = [this.editor.getVectorLayer().getMapLayer(),this.editor.getEditVectorLayer().getMapLayer()];
  
  this.pickFeatureInteraction = new PickFeatureInteraction({
    layers: layers
  });
  
  this.pickFeatureInteraction.on('picked',function(e){
    if (!self._busy){
      self._busy = true;
      self.pause(true);
      self.pickFeature(e.feature)
      .then(function(res){
        self._busy = false;
        self.pause(false);
      })
    }
  });
  
  this.addInteraction(this.pickFeatureInteraction);
};

proto.pause = function(pause){
  if (_.isUndefined(pause) || pause){
    this.pickFeatureInteraction.setActive(false);
  }
  else {
    this.pickFeatureInteraction.setActive(true);
  }
};

// metodo eseguito alla disattivazione del tool
proto.stop = function(){
  this.removeInteraction(this.pickFeatureInteraction);
  this.pickFeatureInteraction = null;
  return true;
};

proto._fallBack = function(feature){
  this._busy = false;
  this.pause(false);
};
