/**
 * @file
 * @since 3.8.0
 */

import * as vueComponentOptions from 'components/ChangeMapMenu.vue';

const { base, inherit, merge } = require('utils');
const Component = require('gui/component/component');

const InternalComponent = Vue.extend(vueComponentOptions);

function ChangeMapMenuComponent(options={}) {
  options.id = 'changemapmenu';
  base(this, options);
  this.state.visible = true;
  merge(this, options);
  this.internalComponent = new InternalComponent();
}
inherit(ChangeMapMenuComponent, Component);

module.exports = ChangeMapMenuComponent;

