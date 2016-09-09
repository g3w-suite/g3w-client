var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

// CLASSE PADRE DI TUTTI GLI EDITING TOOL
function EditingTool(editor, options) {

  this._interactions = [];
  this.editor = editor;
  this.layer = this.editor.getVectorLayer().getMapLayer();
  this.editingLayer = this.editor.getEditVectorLayer().getMapLayer();
  this.options = options || {};
  this.steps = null;
  
  base(this);
}

inherit(EditingTool, G3WObject);

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
  _.forEach(this._interactions, function(_interaction) {
    if (_interaction == interaction) {
      owns = true;
    }
  });
  return owns;
};

proto.stop = function(){
  if (this.steps) {
    this.steps.destroy();
  }
  return true;
};

// metodo che deve essere sovrascritto dalle
// sottoclassi
proto.run = function() {
  console.log('Se appare quasto messaggio significa che non è stato sovrascritto il metodo run() dalla sottoclasse');
};

EditingTool.Steps = function(steps) {
  var index = -1;
  //ARRAY
  var steps = steps;
  
  this.next = function(){
    index += 1;
    var step = steps[index];
    this.emit('step', index, step);
  };
  
  this.currentStep = function() {
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
};

inherit(EditingTool.Steps,G3WObject);

module.exports = EditingTool;
