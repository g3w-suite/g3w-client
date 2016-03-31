var inherit = require('./utils').inherit;
var G3WObject = require('g3w/core/g3wobject');

// Una classe che eredita da StateProvider fornirà uno stato (utilizzato ad es. dalle componenti della GUI).
// Se fornisce dei metodi setters, all'interno di un oggetto "setters", è possibile registrare dei listeners PRIMA e/o DOPO l'esecuzione di tali metodi.
// Quando viene eseguito un setter viene anche emesso un evento "stateChanged".
function StateProvider(){}
inherit(StateProvider,G3WObject);

var proto = StateProvider.prototype;

proto.stateSet = function(path,value){
  var oldValue = _.get(this.state,path,null);
  if(!oldValue){
    return;
  }
  var pathKey = this.getPathKey(path);
  var settersListeners = this.getsettersListeners();
  var listeners = settersListeners[pathKey];
  var canSet = true;
  _.forEach(listeners,function(listener, key){
    canSet &= listener.apply(this,[value,oldValue]);
  })
  if(canSet){
    console.log("Setting: "+path+"="+value);
    _.set(this.state,path,value);
  }
};

// un listener può registrarsi in modo da essere eseguito DOPO l'esecuzione del metodo setter.
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

// inizializza tutti i metodi definiti nell'oggetto "setters" della classe figlia.
proto.initSetters = function(setters){
  var self = this;
  this.settersListeners = {after:{},before:{}};
  this.setters = setters;
  _.forEach(setters,function(setterFnc,setter){
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
      setterFnc.apply(self,args);
      // eseguo i listener registrati per l'after
      var afterListeners = this.settersListeners['after'][setter];
      _.forEach(afterListeners,function(listener, key){
        listener.apply(this,args);
      })
      self.emit("stateChanged");
    }
  })
};

module.exports = StateProvider;
