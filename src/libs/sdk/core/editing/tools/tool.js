var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

function EditingTool(editor,options){
  this.editor = editor;
  this.layer = this.editor.getVectorLayer().getLayer();
  this.editingLayer = this.editor.getEditVectorLayer().getLayer();
  this.map = GUI.getComponent('map').getService().viewer.map;
  this.isPausable = false;
  this.options = options || {};
  this.steps = null;
  
  base(this);
}
inherit(EditingTool,G3WObject);

var proto = EditingTool.prototype;

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

module.exports = EditingTool
