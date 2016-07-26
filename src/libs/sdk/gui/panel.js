var localize = require('core/i18n/i18n.service').t;
var inherit = require('core/utils/utils').inherit;
var resolvedValue = require('core/utils/utils').resolve;
var G3WObject = require('core/g3wobject');

var Panel = function(options) {
  self = this;
  var options = options || {};
  self.id = options.id || null;
  self.title = options.title || '';
};

inherit(Panel, G3WObject);

var proto = Panel.prototype;

proto.getId = function(){
  return self.id;
};

proto.getTitle = function(){
  return self.title;
};

/* HOOKS */

/*
 * Il metodo permette al pannello di montarsi nel DOM
 * parent: elemento DOM padre, su cui inserirsi;
 * ritorna una promise, risolta nel momento in cui sarà terminato il montaggio
*/

// SONO DUE TIPOLOGIE DI MONTAGGIO CON IL QUALE IL PANNELLO
// CHE VERRA' MONTATO AL VOLO CON IL METODO MOUNT A SECONDA DEL TIPO DI PANNELLO RICHIESTO

// richiamato quando la GUI chiede di chiudere il pannello. Se ritorna false il pannello non viene chiuso

proto.mount = function(parent) {
  var panel = this.InternalPanel;
  panel.$mount().$appendTo(parent);
  localize();
  return resolvedValue(true);
};

/*
 * Metodo richiamato quando si vuole rimuovere il panello.
 * Ritorna una promessa che sarà risolta nel momento in cui il pannello avrà completato la propria rimozione (ed eventuale rilascio di risorse dipendenti)
*/
proto.unmount = function(){
  var panel = this.InternalPanel;
  var deferred = $.Deferred();
  panel.$destroy(true);
  deferred.resolve();
  return deferred.promise();
};

/*
 * Metodo (opzionale) che offre l'opportunità di ricalcolare proprietà dipendenti dalle dimensioni del padre
 * parentHeight: nuova altezza del parent
 * parentWidth: nuova larghezza del parent
 * richiamato ogni volta che il parent subisce un ridimensionamento
*/
proto.onResize = function(parentWidth,parentHeight){};


module.exports = Panel;
