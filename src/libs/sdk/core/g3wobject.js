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
 */
proto.onafter = function(setter,listener){
  return this._onsetter('after',setter,listener,false);
};

// un listener può registrarsi in modo da essere eseguito PRIMA dell'esecuzione del metodo setter. Può ritornare true/false per
// votare a favore o meno dell'esecuzione del setter. Se non ritorna nulla o undefined, non viene considerato votante
/**
 * Inserisce un listener prima che venga eseguito il setter. Se ritorna false il setter non viene eseguito
 * @param {string} setter - Il nome del metodo su cui si cuole registrare una funzione listener
 * @param {function} listener - Una funzione listener, a cui viene passato una funzione "next" come ultimo parametro, da usare nel caso di listener asincroni
 */
proto.onbefore = function(setter,listener){
  return this._onsetter('before',setter,listener,false);
};

/**
 * Inserisce un listener prima che venga eseguito il setter. Al listener viene passato una funzione "next" come ultimo parametro, da chiamare con parametro true/false per far proseguire o meno il setter
 * @param {string} setter - Il nome del metodo su cui si cuole registrare una funzione listener
 * @param {function} listener - Una funzione listener, a cui 
 */
proto.onbeforeasync = function(setter,listener){
  return this._onsetter('before',setter,listener,true);
};

proto.un = function(setter,key){
  _.forEach(this.settersListeners,function(settersListeners,when){
    _.forEach(settersListeners[setter],function(setterListener){
      if(setterListener.key == key){
        delete setterListener;
      }
    })
  })
};

proto._onsetter = function(when, setter, listener, async) { /*when=before|after, type=sync|async*/
  var settersListeners = this.settersListeners[when];
  var listenerKey = ""+Math.floor(Math.random()*1000000)+""+Date.now();
  /*if ((when == 'before') && !async){
    listener = this._makeChainable(listener);
  }*/
  settersListeners[setter].push({
    key: listenerKey,
    fnc: listener,
    async: async
  });
  return listenerKey;
};


proto._setupListenersChain = function(setters) {
  // inizializza tutti i metodi definiti nell'oggetto "setters" della classe figlia.
  var self = this;
  this.settersListeners = {
    after:{},
    before:{}
  };
  // per ogni setter viene definito l'array dei listeners e fiene sostituito il metodo originale con la funzioni che gestisce la coda di listeners
  _.forEach(setters, function(setterOption, setter) {
    //setter : nome della funzione setter
    //setterOption: funzione(di solito anonima)
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
    // viene creata una propietà setter dell'oggetto
    // avente setters come proprità
    // la quale è una vesrione modificata della funziona
    //in quanto da prevedere i possibili listener (after, before, beoforeasync)
    self[setter] = function() {
      var args = arguments;
      // eseguo i listener registrati per il before
      var deferred = $.Deferred();
      //valore ritornata dalla funzione setter
      var returnVal = null;
      //contatore
      var counter = 0;
      // estraggo l'array delle funzioni listener del setter
      //quelle before (onbefore, onbeforeasync)
      var beforeListeners = this.settersListeners['before'][setter];
      // contatore dei listener che verrà decrementato ad ogni chiamata a next()
      counter = 0;
      // funzione complete
      function complete() {
        // eseguo la funzione
        returnVal = setterFnc.apply(self, args);
        // e risolvo la promessa (eventualmente utilizzata da chi ha invocato il setter
        deferred.resolve(returnVal);
        //lacio tutti gli after
        var afterListeners = self.settersListeners.after[setter];
        _.forEach(afterListeners,function(listener, key){
          listener.fnc.apply(self,args);
        })
      }
      // funzione abort
      function abort(){
          // se non posso proseguire ...
          // chiamo l'eventuale funzione di fallback
          setterFallback.apply(self,args);
          // e rigetto la promessa
          deferred.reject();
      }
      // funzione passata come ultimo parametro ai listeners,
      // che ***SE SONO STATI AGGIUNTI COME ASINCRONI la DEVONO***
      // richiamare per poter proseguire la catena
      function next(bool) {
        var cont = true;
        //la prima volta(prima chiamata è undefined)
        if (_.isBoolean(bool)){
          cont = bool;
        }
        //prende gli aromenti passati alla funzione setter
        // server per "clonare l'array degli argomenti passati in origine alla funzione setter"
        var _args = Array.prototype.slice.call(args);
        // se la catena è stata bloccata o se siamo arrivati alla fine dei beforelisteners
        if (cont === false || (counter == beforeListeners.length)) {
          if(cont === false)
            abort.apply(self,args);
          else{
            completed = complete.apply(self,args);
            if(_.isUndefined(completed) || completed === true){
              self.emitEvent('set:'+setter,args);
            }
          }
        } else {
          //next(true) o next() prima volta
          if (cont) {
            //funzione che ascolta la chiamata del metodo
            var listenerFnc = beforeListeners[counter].fnc;
            //verifica se è asincrono
            // in tale caso lascio alla funzione  listener la possibilità di andare
            // avanti o meno (questo inteso il modo asincrono)
            // passando la funzione next come argomento della funzione
            if (beforeListeners[counter].async) {
              // aggiungo next come ulitmo parametro
              _args.push(next);
              counter += 1;
              listenerFnc.apply(self,_args)
            }
            else {
              var _cont = listenerFnc.apply(self, _args);
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
  _.forEach(this.settersListeners,function(setterListeners,setter){
      _.forEach(setterListeners,function(listener,idx){
        if (listener.key == listenerKey) {
          setterListeners.splice(idx,1);
          delete listener;
        }
      })
  })
};

module.exports = G3WObject;
