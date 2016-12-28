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
// componente content
function ContentsViewerComponent(options){
  base(this,options);
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
  this.internalComponent.state = this.state;
}

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
    this.clearContents()
    .then(function() {
      self.addContent(content,options)
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

proto.addContent = function(content,options) {
  var self = this;
  options.parent = this.internalComponent.$el;
  options.append = true;
  return this.stack.push(content,options)
  .then(function(){
    self.contentsdata = self.stack.state.contentsdata;
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
  .then(function(){
    self.contentsdata = self.stack.state.contentsdata;
    self.updateContentVisibility();
  });
};

proto.getCurrentContentData = function(){
  return this.stack.getCurrentContentData();
};

proto.getPreviousContentData = function() {
  return this.stack.getPreviousContentData();
};

proto.updateContentVisibility = function() {
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

proto.layout = function(parentWidth,parentHeight) {
  var self = this;
  var el = $(this.internalComponent.$el);
  Vue.nextTick(function(){
    var height = el.parent().height() - el.siblings('.close-panel-block').outerHeight(true) - el.siblings('.g3w_contents_back').outerHeight(true);
    el.height(height);
    el.children().first().height(height);
    var contentsdata = self.stack.state.contentsdata;
    contentsdata.forEach(function(data){
      if (typeof data.content.layout == 'function') {
        data.content.layout(parentWidth,height);
      }
    })
  })
};

module.exports = ContentsViewerComponent;
