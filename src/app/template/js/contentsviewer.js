var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var Stack = require('./barstack.js');
// componente base
var Component = require('gui/vue/component');

// componente interno (VUE) del content della viewport
var InternalComponent = Vue.extend({
  template: require('../html/contentsviewer.html'), // altro non è che <div id="contents" class="contents"></div>
  data: function() {
    return {
      state: null
    }
  }
});

// componente content Viewer
function ContentsViewerComponent(options) {
  base(this, options);
  this.stack = new Stack();
  // setta come servizio se stesso
  this.setService(this);
  this.title = "contents";
  // lo state del component padre è
  /*
   this.state = {
    visible: options.visible || true,
    open: options.open || false
   }
   */
  this.contentsdata = this.stack.state.contentsdata;
  this.state.visible = true;
  // vado a settare il componente interno
  // sfruttando il metodo del componente base
  this.setInternalComponent(new InternalComponent({
    service: this
  }));
  // setto lo state del componente interno vue uguale allo state del service
  // che non è altro lo state component padre state={open, visible};
  this.internalComponent.state = this.state;
}

/// stooto classe di Component
inherit(ContentsViewerComponent, Component);

var proto = ContentsViewerComponent.prototype;

// setta il contenuto dell content
proto.setContent = function(options) {
  var self = this;
  var d = $.Deferred();
  var push = options.push || false;
  var content = options.content;
  // svuoto sempre lo stack, così ho sempre un solo elemento (la gestione dello stack è delegata alla viewport).
  // Uso comunque barstack perché implementa già la logica di montaggio dei contenuti nel DOM
  if (!push) {
    // elemino tutto lo stack content
    this.clearContents()
    .then(function() {
      self.addContent(content, options)
      .then(function(){
        d.resolve();
      })
    })
  }
  else {
    this.addContent(content,options)
    .then(function(){
      d.resolve();
    })
  }
  return d.promise();
};

//aggiunge al componente base content componenti
proto.addContent = function(content, options) {
  var self = this;
  // l'emento parente è proprio il template content
  options.parent = this.internalComponent.$el;
  // definisce l'append a true
  options.append = true;
  // stack.push è una promise
  return this.stack.push(content, options)
  .then(function() {
    // prendo il contentuo dello stack
    self.contentsdata = self.stack.state.contentsdata;
    // aggiorna la visibilità dei vari componenti vue montati
    self.updateContentVisibility();
  })
};

// rimuove il contenuto dallo stack
proto.removeContent = function() {
  return this.clearContents();
};

// usato da viewport.js
proto.popContent = function() {
  var self = this;
  return this.stack.pop()
  .then(function() {
    // solo dopo che lo stack è stato aggiornato aggiorna il contentsdata
    self.contentsdata = self.stack.state.contentsdata;
    // aggiorna la visibilità dei vari componenti vue montanti
    self.updateContentVisibility();
  });
};

// restituisce il current contentdata
proto.getCurrentContentData = function(){
  return this.stack.getCurrentContentData();
};

// restituisce il previuos content data
proto.getPreviousContentData = function() {
  return this.stack.getPreviousContentData();
};

// funzione che aggiorna la visibilità dei componenti del content
proto.updateContentVisibility = function() {
  // hide tuttigli elementi all'infuri che l'ultimo
  var contentsEls = $(this.internalComponent.$el).children();
  contentsEls.hide();
  contentsEls.last().show();
};

// fa il clear dello stack in quanto si vuole che lo stack del contenteComponente
// deve essere sempre vuoto in partenza
proto.clearContents = function() {
  var self = this;
  return this.stack.clear()
  .then(function() {
    self.contentsdata = self.stack.state.contentsdata;
  })
};

// funzione che serve per definire di volta in volta il layout del content
// i parametri sono l'altezza e la larghezza dell'elemento parent contenitore
proto.layout = function(parentWidth, parentHeight) {
  var self = this;
  // elemento template del componente vue
  var el = $(this.internalComponent.$el);
  //lancia la callback solo dopo che è stato aggiornato lo stato di Vue
  Vue.nextTick(function() {
    // el.parent() è il div g3w-view-content
    var height = el.parent().height() - el.siblings('.close-panel-block').outerHeight(true) - el.siblings('.g3w_contents_back').outerHeight(true);
    el.height(height);
    el.children().first().height(height);
    var contentsdata = self.stack.state.contentsdata;
    contentsdata.forEach(function(data) {
      //vado a scorrere su tutti i cmponenti caricari nello stack
      if (typeof data.content.layout == 'function') {
        // vado a chiamare la funzione layout di tutti i componenti presenti nello stack
        data.content.layout(parentWidth, height);
      }
    })
  })
};

module.exports = ContentsViewerComponent;
