var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');

var Component = function(options) {
  var options = options || {};
  this.internalComponent = null;
  this.id = options.id || Math.random() * 1000;
  this.title = options.title || ''
  this.state = {
    visible: options.visible || true,
    open: options.open || false
  }
};
inherit(Component,G3WObject);

var proto = Component.prototype;

proto.getId = function(){
  return this.id;
};

proto.getTitle = function(){
  return this.state.title;
};

proto.setTitle = function(title) {
  this.state.title = title;
}

/* HOOKS */

/* 
 * Il metodo permette al componente di montarsi nel DOM
 * parentEl: elemento DOM padre, su cui inserirsi; 
 * ritorna una promise, risolta nel momento in cui sarà terminato il montaggio
*/
proto.mount = function(parent){};

/*
 * Metodo richiamato quando si vuole rimuovere il componente.
 * Ritorna una promessa che sarà risolta nel momento in cui il componente avrà completato la propria rimozione (ed eventuale rilascio di risorse dipendenti)
*/
proto.unmount = function(){};

/* 
 * Metodo (opzionale) che offre l'opportunità di ricalcolare proprietà dipendenti dalle dimensioni del padre
 * parentHeight: nuova altezza del parent
 * parentWidth: nuova larghezza del parent
 * richiamato ogni volta che il parent subisce un ridimensionamento
*/
proto.layout = function(parentWidth,parentHeight){};


module.exports = Component;
