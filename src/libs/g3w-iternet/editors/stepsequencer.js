var inherit = require('g3w/core//utils').inherit;
var G3WObject = require('g3w/core/g3wobject');

// questo oggetto gestisce la sequenza di step tramite transizioni
// le transizioni vengono lanciate da eventi oppure da listeners esterni tramite la funzione next() [vedi sotto]
function StepSequencer(editor){
  this.editor = editor;
  this._transitions = {};
  this._transition = null;
  this._step = null;
}
inherit(StepSequencer,G3WObject);
module.exports = StepSequencer;

var proto = StepSequencer.prototype;

// metodo per avviare la sequenza degli stati e delle relative transizioni
proto.play = function(transitions){
  var self = this;
  this._transitions = _.cloneDeep(transitions);
  _.forEach(this._transitions,function(transition, event){
    self._bindEvent(event);
  })
};

proto.stop = function(){
  if (this._step){
    this._step.stop();
  }
  this._transition = null;
};

/* METODI PRIVATI */

proto._bindEvent = function(event){
  this.editor.on(event,_.bind(this._startTransition,this,event));
};

// avvia una transizione tra step
proto._startTransition = function(event){
  // se c'è uno step attivo lo stoppo
  if (this._step) {
    this._step.stop();
  }
  var transition = this._transition = _.cloneDeep(this._transitions[event]);
  var nextFnc = _.bind(this._next,this);
  if (transition) {
    this._next();
  }
};

// termina una transizione tra step
proto._endTransition = function(transition){
  this._transition = null;
};

proto._commitTransition = function(step){
  var step = this._step = this.editor._steps[step];
  // avvio lo step
  step.run();
};

proto._goToStep = function(step){
  this.editor._steps[step].apply(this.editor);
};

// funzione per gestire una transizione
// usata anche da eventuali listeners per bloccare [next(false)] o continuare [next()] la transizione
// oppure per passare direttamente ad un altro step dell'editazione [next(step)]
proto._next = function(value){
  if (value === false) {
    this._rollbackTransition();
    return;
  };
  var stepId = value;
  if (stepId && _.has(this.editor._steps,stepId)){
    this._commitTransition(step);
  }
  else {
    if (this._transition) {
      if (this._transition.listeners.length) {
        var listener = this._transition.listeners.pop();
        var nextFnc = _.bind(this._next,this);
        listener.call(this.editor,nextFnc)
      }
      else {
        this._commitTransition(this._transition.goto);
      }
    }
  }
};
