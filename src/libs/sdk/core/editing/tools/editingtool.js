var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

function EditingTool(editor,options) {
  var self = this;
  this._interactions = [];
  this.editor = editor;
  this.layer = this.editor.getVectorLayer().getMapLayer();
  this.editingLayer = this.editor.getEditVectorLayer().getMapLayer();
  this.isPausable = false;
  this.options = options || {};
  this.steps = null;
  
  /*var mapService = this.editor.getMapService();
  mapService.on('pointerInteractionSet',function(interaction){
    var isMineInteraction = false;
    _.forEach(self._interactions,function(_interaction){
      if (_interaction == interaction) {
        isMineInteraction = true;
      }
    })
    if (!isMineInteraction) {
      console.log("Qualcuno ha preso il controllo");
      self.editor.stopTool();
    }
  });*/
  
  base(this);
}
inherit(EditingTool,G3WObject);

var proto = EditingTool.prototype;

proto.addInteraction = function(interaction) {
  var mapService = this.editor.getMapService();
  mapService.addInteraction(interaction);
  this._interactions.push(interaction);
};

proto.removeInteraction = function(interaction) {
  var _interactions = this._interactions;
  var mapService = this.editor.getMapService();
  _.forEach(_interactions,function(_interaction,idx) {
    if (_interaction == interaction) {
      _interactions.splice(idx,1);
    }
  });
  mapService.removeInteraction(interaction);
};

proto.ownsInteraction = function(interaction) {
  var owns = false;
  _.forEach(this._interactions,function(_interaction) {
    if (_interaction == interaction) {
      owns = true;
    }
  })
  return owns;
};

proto.stop = function(){
  if (this.steps) {
    this.steps.destroy();
  }
  return true;
}

EditingTool.Steps = function(steps){
  var index = -1;
  var steps = steps;
  
  this.next = function(){
    index += 1;
    var step = steps[index];
    this.emit('step',index,step);
  };
  
  this.currentStep = function(){
    return steps[index];
  };
  
  this.currentStepIndex = function(){
    return index;
  };
  
  this.totalSteps = function(){
    return steps.length;
  };
  
  this.reset = function(){
    index = 0;
  };
  
  this.destroy = function(){
    this.removeAllListeners();
  };
  
  this.completed = function(){
    this.emit('complete');
    this.reset();
  };
  
  this.insertStepAt = function(idx,step){
    steps.splice(idx,0,step);
  }
}
inherit(EditingTool.Steps,G3WObject);

module.exports = EditingTool;
