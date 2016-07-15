var localize = require('core/i18n/i18n.service').t;
var inherit = require('core/utils/utils').inherit;
var resolvedValue = require('core/utils/utils').resolve;
var G3WObject = require('core/g3wobject');

var PanelType = [
  'one', // unico nel senso ci può essere un solo panello alla volta (esempio risultati)
  'stack' // ci possono essere più pannelli impilati uno sull'altro (esempio editing etc.. modello iternet)
];

var Panel = function(options) {
  self = this;
  var options = options || {};
  self.id = options.id || null;
  self.title = options.title || '';
  self.type = options.type || 'one';
};

inherit(Panel, G3WObject);

var proto = Panel.prototype;

proto.getId = function(){
  return self.id;
};

proto.getTitle = function(){
  return self.title;
};

//setta il tipo di pannello
proto.setType = function(type) {
  //soluzione temporanea
  if (PanelType.indexOf(type) < 0) {
    type = 'one';
  };
  self.type = type;
};
//ritorna il tipo di pannello
proto.getType = function() {
  return self.type;
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
  var panel = new this.InternalPanel();
  switch(this.type) {
    case 'one':
      panel.$mount(parent);
      break;
    case 'stack':
      panel.$mount().$appendTo(parent);
      break;
    default:
      break;
  };
  localize();
  return resolvedValue(true);
};

/*
 * Metodo richiamato quando si vuole rimuovere il panello.
 * Ritorna una promessa che sarà risolta nel momento in cui il pannello avrà completato la propria rimozione (ed eventuale rilascio di risorse dipendenti)
*/
proto.unmount = function(){
  var self = this;
  var deferred = $.Deferred();
  self.panelComponent.$destroy(true);
  self.panelComponent = null;
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
