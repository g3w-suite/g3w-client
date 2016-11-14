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
function ContentsComponent(options){
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
  this.state.visible = true;
  this._content = null;
  // vado a settare il componente interno
  // sfruttando il metodo del componente base
  this.setInternalComponent(new InternalComponent({
    service: this
  }));
  // setto lo state del componente interno vue uguale allo state del service
  this.internalComponent.state = this.state;
}

inherit(ContentsComponent, Component);

var proto = ContentsComponent.prototype;

// setta il contenuto dell content
proto.setContent = function(content) {
  var self = this;
  var d = $.Deferred();
  // svuoto sempre lo stack, così ho sempre un solo elemento (la gestione dello stack è delegata alla viewport).
  // Uso comunque barstack perché implementa già la logica di montaggio dei contenuti nel DOM
  this.clearContents()
  .then(function () {
    self.stack.push(content, self.internalComponent.$el, true)
    .then(function(){
      d.resolve();
    });
  });
  return d.promise();
};
// rimuove il contenuto dallo stack
proto.removeContent = function() {
  return this.stack.pop();
};
// usato da viewport.js
proto.popContent = function() {
  return this.removeContent()
};
// fa il clear dello stack in quanto si vuole che lo stack del contenteComponente
// deve essere sempre vuoto in partenza
proto.clearContents = function() {
  return this.stack.clear();
};

proto.layout = function(parentWidth,parentHeight) {
  var self = this;
  var el = $(this.internalComponent.$el);
  Vue.nextTick(function(){
    var height = el.parent().height() - el.siblings('.close-panel-block').outerHeight(true) - el.siblings('.g3w_contents_back').outerHeight(true);
    el.height(height);
    self.stack.forEach(function(component){
      if (typeof component.layout == 'function') {
        component.layout(parentWidth,height);
      }
    })
  })
};

module.exports = ContentsComponent;
