var t = require('core/i18n/i18n.service').t;
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var Stack = require('./barstack.js');
var Component = require('gui/vue/component');

var InternalComponent = Vue.extend({
    template: require('../html/contents.html'),
    data: function() {
      return {
        state: null
      }
    },
});

function ContentsComponent(options){
  base(this,options);
  var self = this;
  this.stack = new Stack();
  this._service = this;
  this.id = "contents";
  this.title = "contents";
  this.state.visible = true;
  
  this._content = null;
  
  merge(this, options);
  this.internalComponent = new InternalComponent({
    service: this
  });
  this.internalComponent.state = this.state;
};
inherit(ContentsComponent, Component);

var proto = ContentsComponent.prototype;

proto.setContent = function(content,push) {
  if (!push) {
    this.clearContents();
  }
  return this.stack.push(content,this.internalComponent.$el, true);
};

proto.removeContent = function() {
  return this.stack.pop();
};

// usato da viewport.js
proto.popContent = function() {
  return this.removeContent()
};

proto.clearContents = function() {
  return this.stack.clear();
};

module.exports = ContentsComponent;
