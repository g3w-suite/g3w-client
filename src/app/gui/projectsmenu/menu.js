import * as vueComponentOptions from 'components/ProjectsMenu.vue';

const { base, inherit, merge } = require('utils');
const Component = require('gui/component/component');

const InternalComponent = Vue.extend(vueComponentOptions);

function MenuComponent(options={}){
  base(this,options);
  this.title = options.title || "menu";
  this.state.visible = true;
  this.state.menuitems = options.menuitems;
  const host = options.host;
  merge(this, options);
  this.internalComponent = new InternalComponent({
    service: this,
    host
  });
  this.internalComponent.state = this.state;
}
inherit(MenuComponent, Component);

const proto = MenuComponent.prototype;

proto.trigger = function(item) {};

module.exports = MenuComponent;

