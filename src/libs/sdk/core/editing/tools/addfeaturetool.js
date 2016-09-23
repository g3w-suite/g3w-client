var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;

var EditingTool = require('./editingtool');

function AddFeatureTool(editor, options) {

  var options = options || {};
  this._running = false;
  this._busy = false;
  this.source = editor.getEditVectorLayer().getMapLayer().getSource();
  this.drawInteraction = null;
  this._snap = options.snap || null;
  this._snapInteraction = null;
  this._finishCondition = options.finishCondition || _.constant(true);
  this._condition = options.condition || _.constant(true);
  // qui si definiscono i metodi che vogliamo poter intercettare,
  // ed eventualmente bloccare (vedi API G3WObject)
  this.setters = {
    addFeature: {
      fnc: AddFeatureTool.prototype._addFeature,
      fallback: AddFeatureTool.prototype._fallBack
    }
  };
  
  base(this, editor);
}

inherit(AddFeatureTool, EditingTool);

module.exports = AddFeatureTool;

var proto = AddFeatureTool.prototype;

// metodo eseguito all'avvio del tool
proto.run = function() {
  var self = this;
  //definisce l'interazione che deve essere aggiunta
  // specificando il layer sul quale le feature aggiunte devono essere messe
  this.drawInteraction = new ol.interaction.Draw({
    type: this.editor.getEditVectorLayer().geometrytype,
    source: this.source,
    condition: this._condition,
    finishCondition: this._finishCondition // disponibile da https://github.com/openlayers/ol3/commit/d425f75bea05cb77559923e494f54156c6690c0b
  });
  //aggiunge l'interazione tramite il metodo generale di editor.js
  // che non fa altro che chaimare il mapservice
  this.addInteraction(this.drawInteraction);
  //setta attiva l'interazione
  this.drawInteraction.setActive(true);
  // viene settato sull'inizio del draw l'evento drawstart dell'editor
  this.drawInteraction.on('drawstart',function(e) {
    self.editor.emit('drawstart',e);
  });
  // viene settato l'evento drawend
  this.drawInteraction.on('drawend', function(e) {
    self.editor.emit('drawend',e);
    if (!self._busy) {
      self._busy = true;
      self.pause();
      //viene chiamato l'addFeature del che  tool (modificata da G3wobject) che
      // chiama l'addfeature del buffer
      // il metodo (essendo un "setter") scatena gli eventuali listeners
      // dati da onbefore, onafter, onbeforeasync
      self.addFeature(e.feature);
    }
  });
  //snapping
  if (this._snap) {
    this._snapInteraction = new ol.interaction.Snap({
      source: this._snap.vectorLayer.getSource()
    });
    this.addInteraction(this._snapInteraction);
  }
};
//metodo pausa
proto.pause = function(pause) {
  // se non definito o true disattiva (setActive false) le iteractions
  if (_.isUndefined(pause) || pause) {
    if (this._snapInteraction) {
      this._snapInteraction.setActive(false);
    }
    this.drawInteraction.setActive(false);
  }
  else {
    if (this._snapInteraction) {
      this._snapInteraction.setActive(true);
    }
    this.drawInteraction.setActive(true);
  }
};

// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  //rimuove e setta a null la _snapInteraction
  if (this._snapInteraction) {
     this.removeInteraction(this._snapInteraction);
     this._snapInteraction = null;
  }
  //rimove l'interazione e setta a null drawInteracion
  this.removeInteraction(this.drawInteraction);
  this.drawInteraction = null;
  // rtirna semprte true
  return true;
};

proto.removeLastPoint = function() {
  if (this.drawInteraction) {
    // provo a rimuovere l'ultimo punto. Nel caso non esista la geometria gestisco silenziosamente l'errore
    try{
      this.drawInteraction.removeLastPoint();
    }
    catch (e) {
      //
    }
  }
};
// add Feature fnc setter function
proto._addFeature = function(feature) {
  // aggiungo la geometria nell'edit buffer
  this.editor.addFeature(feature);
  this._busy = false;
  this.pause(false);
  return true;
};
// funzione di call back del setter addFeature
proto._fallBack = function(feature) {
  this._busy = false;
  // rimuovo l'ultima feature inserita, ovvero quella disegnata ma che non si vuole salvare
  if (this.source.getFeaturesCollection().getLength()){
    this.source.getFeaturesCollection().pop();
    this.pause(false);
  }
};
