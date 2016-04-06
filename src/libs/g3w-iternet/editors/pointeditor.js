var inherit = require('g3w/core/utils').inherit;
var G3WObject = require('g3w/core/g3wobject');

var Sequencer = require('./stepsequencer');

// Editor di vettori puntuali
function PointEditor(config){
  this._vector = null;
  this._running = false;
  this._sequencer = null;
  
  // sono i vari step dell'editing, gestiti da uno specifico oggetto
  this._steps = {
    'addingpoint': new AddPointStep(this)
  };
  
  // le transizioni definiscono come si entra in uno step dell'editazione
  this._transitions = {
    // strumento di editazione
    addpoint: {
      // evento dell'editor che scatena una transizione
      addstarted:{
        // step di arrivo della transizione
        goto: 'addingpoint',
        // eventuali listeners sulla transizione. La possono bloccare, far proseguire o deviare ad altri step (vedi oggetto sequencer)
        listeners: []
      },
    },
    movepoint: [],
    deletepoint: []
  };
}
inherit(PointEditor,G3WObject);
module.exports = PointEditor;

var proto = PointEditor.prototype;

// associa l'oggetto VectorLayer su cui si vuole fare l'editing
proto.setVector = function(vector){
  this.vector = vector;
};

// termina l'editazione
proto.stop = function(){
  if (this._running){
    this.removeAllListeners();
    this._sequencer.stop();
    this._sequencer = null;
  }
}

// avvia l'inserimento di punti
proto.startAdd = function(action,options){
  this._sequencer = new Sequencer(this);
  this._sequencer.play(this._transitions.addpoint);
  this.emit("addstarted");
  this._running = true;
};

// metodo per registrare listeners su una transizione (vedi sequencer)
proto.onTransition = function(tool,event,listener){
  var transition = _.get(this._transitions,tool+'.'+event,{});
  if (transition) {
    if (!_.has(transition,'listeners')){
      transition.listeners = []
    }
    transition.listeners.push(listener);
  };
};

function AddPointStep(editor){
  this.editor = editor;
  
  this.run = function(){
    console.log("Avvio aggiunta punto");
  };
  
  this.stop = function(){
    console.log("Terminata aggiunta punto");
  };
}
