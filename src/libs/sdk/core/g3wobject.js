var inherit = require('core/utils/utils').inherit;
var noop = require('core/utils/utils').noop;

/**
 * Un oggetto base in grado di gestire eventuali setter e relativa catena di listeners.
 * @constructor
 */
var G3WObject = function(){
  if (this.setters){
    this._setupListenersChain(this.setters);
  }
};
inherit(G3WObject,EventEmitter);

var proto = G3WObject.prototype;

/**
 * Inserisce un listener dopo che è stato eseguito il setter
 * @param {string} setter - Il nome del metodo su cui si cuole registrare una funzione listener
 * @param {function} listener - Una funzione listener (solo sincrona)
 * @param {number} priority - Priorità di esecuzione: valore minore viene eseuito prima
 */
proto.onafter = function(setter,listener,priority){
  return this._onsetter('after',setter,listener,false,priority);
};

// un listener può registrarsi in modo da essere eseguito PRIMA dell'esecuzione del metodo setter. Può ritornare true/false per
// votare a favore o meno dell'esecuzione del setter. Se non ritorna nulla o undefined, non viene considerato votante
/**
 * Inserisce un listener prima che venga eseguito il setter. Se ritorna false il setter non viene eseguito
 * @param {string} setter - Il nome del metodo su cui si cuole registrare una funzione listener
 * @param {function} listener - Una funzione listener, a cui viene passato una funzione "next" come ultimo parametro, da usare nel caso di listener asincroni
 * @param {number} priority - Priorità di esecuzione: valore minore viene eseuito prima
 */
proto.onbefore = function(setter,listener,priority){
  return this._onsetter('before',setter,listener,false,priority);
};

/**
 * Inserisce un listener prima che venga eseguito il setter. Al listener viene passato una funzione "next" come ultimo parametro, da chiamare con parametro true/false per far proseguire o meno il setter
 * @param {string} setter - Il nome del metodo su cui si cuole registrare una funzione listener
 * @param {function} listener - Una funzione listener, a cui
 * @param {number} priority - Priorità di esecuzione: valore minore viene eseuito prima
 */
proto.onbeforeasync = function(setter,listener,priority){
  return this._onsetter('before',setter,listener,true,priority);
};

proto.un = function(setter,key){
  _.forEach(this.settersListeners,function(settersListeners){
    _.forEach(settersListeners[setter],function(setterListener,idx){
      if(setterListener.key == key){
        settersListeners[setter].slice(idx,1);
      }
    })
  })
};

proto._onsetter = function(when,setter,listener,async,priority){ /*when=before|after, type=sync|async*/
  var settersListeners = this.settersListeners[when];
  var listenerKey = ""+Math.floor(Math.random()*1000000)+""+Date.now();
  /*if ((when == 'before') && !async){
    listener = this._makeChainable(listener);
  }*/

  priority = priority || 0;

  var settersListeneres = settersListeners[setter];

  settersListeneres.push({
    key: listenerKey,
    fnc: listener,
    async: async,
    priority: priority
  });

  settersListeners[setter] = _.sortBy(settersListeneres,function(setterListener){
    return setterListener.priority;
  });

  return listenerKey;
  //return this.generateUnListener(setter,listenerKey);
};

// trasformo un listener sincrono in modo da poter essere usato nella catena di listeners (richiamando next col valore di ritorno del listener)
/*proto._makeChainable = function(listener){
  var self = this
  return function(){
    var args = Array.prototype.slice.call(arguments);
    // rimuovo next dai parametri prima di chiamare il listener
    var next = args.pop();
    var canSet = listener.apply(self,arguments);
    var _canSet = true;
    if (_.isBoolean(canSet)){
      _canSet = canSet;
    }
    next(canSet);
  }
};*/

proto._setupListenersChain = function(setters){
  // inizializza tutti i metodi definiti nell'oggetto "setters" della classe figlia.
  var self = this;
  this.settersListeners = {
    after:{},
    before:{}
  };
  // per ogni setter viene definito l'array dei listeners e fiene sostituito il metodo originale con la funzioni che gestisce la coda di listeners
  _.forEach(setters,function(setterOption,setter){
    var setterFnc = noop;
    var setterFallback = noop;
    if (_.isFunction(setterOption)){
      setterFnc = setterOption
    }
    else {
      setterFnc = setterOption.fnc;
      setterFallback = setterOption.fallback || noop;
    }
    self.settersListeners.after[setter] = [];
    self.settersListeners.before[setter] = [];
    // setter sostituito
    self[setter] = function(){
      var args = arguments;
      // eseguo i listener registrati per il before
      var deferred = $.Deferred();
      var returnVal = null;
      var counter = 0;
      var canSet = true;
      
      function complete(){
        // eseguo la funzione
        returnVal = setterFnc.apply(self,args);
        // e risolvo la promessa (eventualmente utilizzata da chi ha invocato il setter
        deferred.resolve(returnVal);
        
        var afterListeners = self.settersListeners.after[setter];
        _.forEach(afterListeners,function(listener){
          listener.fnc.apply(self,args);
        })
      }
      
      function abort(){
          // se non posso proseguire ...
          // chiamo l'eventuale funzione di fallback
          setterFallback.apply(self,args);
          // e rigetto la promessa
          deferred.reject();
      }
      
      var beforeListeners = self.settersListeners['before'][setter];
      // contatore dei listener che verrà decrementato ad ogni chiamata a next()
      counter = 0;
      
      // funzione passata come ultimo parametro ai listeners, che ***SE SONO STATI AGGIUNTI COME ASINCRONI la DEVONO*** richiamare per poter proseguire la catena
      function next(bool){
        var cont = true;
        if (_.isBoolean(bool)){
          cont = bool;
        }
        var _args = Array.prototype.slice.call(args);
        // se la catena è stata bloccata o se siamo arrivati alla fine dei beforelisteners
        if (cont === false || (counter == beforeListeners.length)){
          if(cont === false)
            abort.apply(self,args);
          else{
            completed = complete.apply(self,args);
            if(_.isUndefined(completed) || completed === true){
              self.emitEvent('set:'+setter,args);
            }
          }
        }
        else {
          if (cont){
            var listenerFnc = beforeListeners[counter].fnc;
            if (beforeListeners[counter].async){
              // aggiungo next come ulitmo parametro
              _args.push(next);
              counter += 1;
              listenerFnc.apply(self,_args)
            }
            else {
              var _cont = listenerFnc.apply(self,_args);
              counter += 1;
              next(_cont);
            }
          }
        }
      }
      
      next();
      return deferred.promise();
    }
  })
};

proto.un = function(listenerKey) {
  _.forEach(this.settersListeners,function(setterListeners){
      _.forEach(setterListeners,function(listener,idx){
        if (listener.key == listenerKey) {
          setterListeners.splice(idx,1);
        }
      })
  })
};

module.exports = G3WObject;
