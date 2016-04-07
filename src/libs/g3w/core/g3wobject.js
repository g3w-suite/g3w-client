var inherit = require('g3w/core/utils').inherit;

var G3WObject = function(){
  if (this.setters){
    // inizializza tutti i metodi definiti nell'oggetto "setters" della classe figlia.
    var self = this;
    var returnVal = null;
    this.settersListeners = {after:{},before:{}};
    _.forEach(this.setters,function(setterFnc,setter){
      self[setter] = function(){
        var args = arguments;
        // eseguo i listener registrati per il before
        var beforeListeners = this.settersListeners['before'][setter];
        var canSet = true;
        _.forEach(beforeListeners,function(listener, key){
          var vote = listener.apply(this,args);
          if (!_.isNil(vote)){
            canSet &= vote;
          }
        })
        if(!canSet){
          return;
        }
        // eseguo la funzione
        returnVal = setterFnc.apply(self,args);
        // eseguo i listener registrati per l'after
        var afterListeners = this.settersListeners['after'][setter];
        _.forEach(afterListeners,function(listener, key){
          listener.apply(this,args);
        })
        self.emit("stateChanged");
        return returnVal;
      }
    })
  }
};
inherit(G3WObject,EventEmitter);

var proto = G3WObject.prototype;

proto.onafter = function(setter,listener){
  this.onsetter('after',setter,listener);
};

// un listener può registrarsi in modo da essere eseguito PRIMA dell'esecuzione del metodo setter. Può ritornare true/false per
// votare a favore o meno dell'esecuzione del setter. Se non ritorna nulla o undefined, non viene considerato votante
proto.onbefore = function(setter,listener){
  this.onsetter('before',setter,listener);
}

proto.onsetter = function(when,setter,listener){
  var settersListeners = this.settersListeners[when];
  if (_.isUndefined(settersListeners[setter])){
    settersListeners[setter] = {};
  }
  var listenerKey = ""+Math.floor(Math.random()*1000000)+""+Date.now();
  settersListeners[setter][listenerKey] = listener;
  return this.generateUnListener(setter,listenerKey);
};

proto.generateUnListener = function(settersListeners,setter,listenerKey){
  var self = this;
  return function(){
    settersListeners[setter][listenerKey] = null;
    delete settersListeners[setter][listenerKey];
  }
};

module.exports = G3WObject;
