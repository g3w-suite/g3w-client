var utils = require('sdk/core/utils/utils');
var inherit = require('sdk/core/utils/utils').inherit;
var G3WObject = require('sdk/core/g3wobject');
var Component = require('gui/vue/component');
var Panel = require('gui/panel');

//classe barstack
// Ha lo scopo di montare stack di pannelli
// sopra ogni parte del parent in questione
function BarStack() {
  this._parent = null;
  // state del barstak contenente array pannelli
  this.state = {
    contentsdata: []
  }
}

//eredita dall'oggetto G3WOBJECT
inherit(BarStack, G3WObject);

var proto = BarStack.prototype;

// funzione che immette il componente (di qualsiasi tipo) nel parent element
proto.push = function(content, options) {
  // parent è l'identificativo dell'elemento DOM sui cui montare (in append o meno) il component/panel
  this._parent = options.parent;
  // chiamo il metodo mount del barstack
  return this._mount(content, options);
};

// toglie l'ultimo componente dallo stack
proto.pop = function(){
  var self = this;
  var d = $.Deferred();
  // qui potremo chiedere al pannello se può essere chiuso...
  if (this.state.contentsdata.length) {
    var content = this.state.contentsdata.slice(-1)[0].content;
    return this._unmount(content)
    .then(function(){
      self.state.contentsdata.pop();
    })
  }
  else {
    d.resolve();
  }
  return d.promise();
};

// fa il clear di tutto lo stack in una volta sola
proto.clear = function() {
  var self = this;
  var d = $.Deferred();
  if (this.state.contentsdata.length) {
    var unmountRequests = [];
    _.forEach(this.state.contentsdata, function (data, idx) {
      unmountRequests.push(self._unmount(data.content));
    });
    $.when(unmountRequests).then(function () {
      //self.state.contentsdata = [];
      self.state.contentsdata.splice(0,self.state.contentsdata.length);
      d.resolve();
    });
  }
  else {
    d.resolve();
  }
  return d.promise();
};

proto.getCurrentContentData = function() {
  return this.state.contentsdata[this.state.contentsdata.length - 1];
};

proto.getPreviousContentData = function() {
  return this.state.contentsdata[this.state.contentsdata.length - 2];
};

// funzione che fa il mopnt del componente
proto._mount = function(content, options) {
  // verifico il tipo di content passato:
  //oggetto JQuery
  if (content instanceof jQuery) {
    return this._setJqueryContent(content);
  }
  //stringa
  else if (_.isString(content)) {
    var jqueryEl = $(content);
    // nel caso in cui content sia testo puro, devo wrapparlo in un tag HTML in modo che $() generi un elemento DOM
    if (!jqueryEl.length) {
      jqueryEl = $('<div>'+content+'</div>');
    }
    return this._setJqueryContent(jqueryEl);
  }
  // istanza componente (vue alla fine)
  else if (content.mount && typeof content.mount == 'function') {
    this._checkDuplicateVueContent(content); // nel caso esista già prima lo rimuovo
    return this._setVueContent(content,options)
  }
  // infine è elemento dom
  else {
    return this._setDOMContent(content);
  }
};

//funzione che permettere di appendere oggetto jquery
proto._setJqueryContent = function(content,options) {
  $(this._parent).append(content);
  this.state.contentsdata.push({
    content: content,
    options: options
  });
  return utils.resolve();
};

//funzione che appende dom element
proto._setDOMContent = function(content,options) {
  this._parent.appendChild(content);
  this.state.contentsdata.push({
    content: content,
    options: options
  });
  return utils.resolve();
};

// funzione che monta il componte su parent
proto._setVueContent = function(content, options) {
  var self = this;
  var d = $.Deferred();
  var append = options.append || false;
  content.mount(this._parent, append)
  .then(function(){
    $(parent).localize();
    // inserisco nell'array del content data un oggetto avente attributi:
    // content: oggetto component
    // options: oprizioni riguardanti title, perc etc ...
    self.state.contentsdata.push({
      content: content,
      options: options
    });
    d.resolve();
  });
  return d.promise();
};

// verifica nel caso di un componente vue
proto._checkDuplicateVueContent = function(content) {
  var self = this;
  var idxToRemove = null;
  var id = content.getId();
  _.forEach(this.state.contentsdata, function(data,idx) {
    if (data.content.getId && (data.content.getId() == id)) {
      idxToRemove = idx;
    }
  });
  if (!_.isNull(idxToRemove)) {
    var data = self.state.contentsdata[idxToRemove];
    data.content.unmount()
      .then(function() {
        self.state.contentsdata.splice(idxToRemove,1);
      });
  }
};

// smonta il componente
proto._unmount = function(content) {
  var self = this;
  var d = $.Deferred();
  if (content instanceof Component || content instanceof Panel) {
    content.unmount()
    .then(function(){
      d.resolve();
    });
  }
  else {
    $(this._parent).empty();
    d.resolve();
  }
  return d.promise();
};

proto.forEach = function(cbk) {
  _.forEach(this.state.contentsdata,function(data){
    cbk(data.content);
  })
};

// resituisce la lunghezza (numero elementi) dello stack
proto.getLength = function() {
  return this.state.contentsdata.length;
};

module.exports = BarStack;
