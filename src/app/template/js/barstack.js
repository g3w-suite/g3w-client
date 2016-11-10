var inherit = require('sdk/core/utils/utils').inherit;
var G3WObject = require('sdk/core/g3wobject');
var Component = require('gui/vue/component');

//classe barstack
// essa server per poter montare stack di pannelli
// sopra ogni parte del parent in questione
function BarStack() {
  this._parent = null;
  // state del barstak contenente array pannelli
  this.state = {
    panels: []
  }
}

inherit(BarStack, G3WObject);

var proto = BarStack.prototype;

// funzione che immette il componente (di qualsiasi tipo) nel parent element
proto.push = function(content, parent, append) {
  // parent è l'identificativo dell'elemento DOM sui cui montare (in append o meno) il component/panel
  this._parent = parent;
  append = append || false;
  // chiamo il metodo mount del barstack
  return this._mount(content, append);
};
// toglie l'ultimo componente dallo stack
proto.pop = function(){
  // qui potremo chiedere al pannello se può essere chiuso...
  if (this.state.panels.length) {
    var content = this.state.panels.slice(-1)[0];
    this._unmount(content);
  }
};
// fa il clear di tutto lo stack in una volta sola
proto.clear = function() {
  var self = this;
  var d = $.Deferred();
  var unmountRequests = [];
  _.forEach(this.state.panels, function(content, idx) {
    unmountRequests.push(self._unmount(content));
  });
  $.when(unmountRequests).then(function(){
    d.resolve();
  });
  return d.promise();
};
// funzione che fa il mopnt del componente
proto._mount = function(content, append) {
  var d = $.Deferred();
  // verifico il tipo di content passato:
  //oggetto JQuery
  if (content instanceof jQuery) {
    this._setJqueryContent(content);
    d.resolve();
  }
  //stringa
  else if (_.isString(content)) {
    var jqueryEl = $(content);
    // nel caso in cui content sia testo puro, devo wrapparlo in un tag HTML in modo che $() generi un elemento DOM
    if (!jqueryEl.length) {
      jqueryEl = $('<div>'+content+'</div>');
    }
    this._setJqueryContent(jqueryEl);
    d.resolve();
  }
  // istanza componente (vue alla fine)
  else if (content.mount && typeof content.mount == 'function') {
    this._checkDuplicateVueContent(content); // nel caso esista già prima lo rimuovo
    this._setVueContent(content, append)
    .then(function(){
      d.resolve();
    });
  }
  // infine è elemento dom
  else {
    this._setDOMContent(content);
    d.resolve();
  }
  return d.promise();
};
//funzione che permettere di appendere oggetto jquery
proto._setJqueryContent = function(content) {
  $(this._parent).append(content);
  this.state.panels.push(content);
};
//funzione che appende dom element
proto._setDOMContent = function(content) {
  this._parent.appendChild(content);
  this.state.panels.push(content);
};
// funzione che monta il componte su parent
proto._setVueContent = function(content, append) {
  var self = this;
  return content.mount(this._parent, append)
  .then(function(){
    $(parent).localize();
    self.state.panels.push(content);
  });
};
// verifica nel caso di un componente vue
proto._checkDuplicateVueContent = function(content) {
  var self = this;
  var idxToRemove = null;
  var id = content.getId();
  _.forEach(this.state.panels, function(_content,idx) {
    if (_content.getId && (_content.getId() == id)) {
      idxToRemove = idx;
    }
  });
  if (!_.isNull(idxToRemove)) {
    var _content = self.state.panels[idxToRemove];
    _content.unmount()
      .then(function() {
        self.state.panels.splice(idxToRemove,1);
      });
  }
};
// smonta il componente
proto._unmount = function(content) {
  var self = this;
  var d = $.Deferred();
  if(content instanceof Component) {
    content.unmount()
    .then(function(){
      //self.state.panels.pop();
      self.state.panels.pop();
      d.resolve();
    });
  }
  else {
    $(this._parent).empty();
    this.state.panels.pop();
    d.resolve();
  }
  return d.promise();
};
// resituisce la lunghezza (numero elementi) dello stack
proto.getLength = function() {
  return this.state.panels.length;
};

module.exports = BarStack;
