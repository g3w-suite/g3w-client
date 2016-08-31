var t = require('core/i18n/i18n.service').t;
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
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

proto.setContent = function(content) {
  if (this._content) {
    this.removeContent();
  }
  if (content instanceof jQuery) {
    this._setDOMContent(content[0]);
  }
  else if (content instanceof Component) {
    this._setVueContent(content);
  }
  else if (_.isString(content)) {
    this._setDOMContent($(content)[0]);
  }
  else {
    this._setDOMContent(content);
  }
};

proto.removeContent = function(content) {
  if(this._content instanceof Component) {
    this._content.unmount();
  }
  else {
    $(this.internalComponent.$el).empty();
  }
};

proto._setDOMContent = function(content) {
  this.internalComponent.$el.appendChild(content);
  this._content = content;
};
proto._setVueContent = function(component) {
  var self = this;
  component.mount(this.internalComponent.$el).
  then(function(){
    self._content = component;
  });
};

module.exports = ContentsComponent;
