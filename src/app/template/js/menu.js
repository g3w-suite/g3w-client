var t = require('core/i18n/i18n.service').t;
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var Component = require('gui/vue/component');
var GUI = require('sdk').gui.GUI;

var InternalComponent = Vue.extend({
  template: require('../html/menu.html'),
  data: function() {
    return {
      state: null
    }
  },
  methods: {
    trigger: function(item) {
      if (item.cbk) {
        item.cbk.apply(item);
      }
      else if (item.href) {
        window.open(item.href, '_blank');
      }
      else if (item.route) {
        GUI.goto(item.route);
      }
      else {
        console.log("Nessuna azione per "+item.title);
      }
    }
  }
});

function MenuComponent(options){
  base(this,options);
  //this.id = "menu_"+Date.now();
  this.title = options.title || "menu";
  this.state.visible = true;
  this.state.menuitems = options.menuitems

  merge(this, options);
  this.internalComponent = new InternalComponent({
    service: this
  });
  this.internalComponent.state = this.state;
};
inherit(MenuComponent, Component);

var proto = MenuComponent.prototype;

proto.trigger = function(item) {

};

module.exports = MenuComponent;

