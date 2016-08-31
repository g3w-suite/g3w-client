var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

var EditingTool = require('./editingtool');

function AddFeatureTool(editor,options){
  var self = this;
  var options = options || {};
  this._running = false;
  this._busy = false;
  this.source = editor.getEditVectorLayer().getMapLayer().getSource();
  this.isPausable = true;
  
  this.drawInteraction = null;
  this._snap = options.snap || null;
  this._snapInteraction = null; 
  
  this._finishCondition = options.finishCondition || _.constant(true);
  
  this._condition = options.condition || _.constant(true);
  
  // qui si definiscono i metodi che vogliamo poter intercettare, ed eventualmente bloccare (vedi API G3WObject)
  this.setters = {
    addFeature: {
      fnc: AddFeatureTool.prototype._addFeature,
      fallback: AddFeatureTool.prototype._fallBack
    }
  };
  
  base(this,editor);
}
inherit(AddFeatureTool,EditingTool);
module.exports = AddFeatureTool;

var proto = AddFeatureTool.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(){
  var self = this;
  
  this.drawInteraction = new ol.interaction.Draw({
    type: this.editor.getEditVectorLayer().geometrytype,
    source: this.source,
    condition: this._condition,
    finishCondition: this._finishCondition // disponibile da https://github.com/openlayers/ol3/commit/d425f75bea05cb77559923e494f54156c6690c0b
  });
  this.addInteraction(this.drawInteraction);
  this.drawInteraction.setActive(true);
  
  this.drawInteraction.on('drawstart',function(e){
    self.editor.emit('drawstart',e);
  });
  
  this.drawInteraction.on('drawend',function(e){
    self.editor.emit('drawend',e);
    if (!self._busy){
      self._busy = true;
      self.pause();
      self.addFeature(e.feature);
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
    this.drawInteraction.setActive(false);
  }
  else {
    if (this._snapInteraction){
      this._snapInteraction.setActive(true);
    }
    this.drawInteraction.setActive(true);
  }
};

// metodo eseguito alla disattivazione del tool
proto.stop = function(){
  if (this._snapInteraction){
     this.removeInteraction(this._snapInteraction);
     this._snapInteraction = null;
  }
  this.removeInteraction(this.drawInteraction);
  this.drawInteraction = null;
  return true;
};

proto.removeLastPoint = function(){
  if (this.drawInteraction){
    // provo a rimuovere l'ultimo punto. Nel caso non esista la geometria gestisco silenziosamente l'errore
    try{
      this.drawInteraction.removeLastPoint();
    }
    catch (e){
      //
    }
  }
};

proto._addFeature = function(feature){
  // aggiungo la geometria nell'edit buffer
  this.editor.addFeature(feature);
  this._busy = false;
  this.pause(false);
  return true;
};

proto._fallBack = function(feature){
  this._busy = false;
  // rimuovo l'ultima feature inserita, ovvero quella disegnata ma che non si vuole salvare
  this.source.getFeaturesCollection().pop();
  this.pause(false);
};
