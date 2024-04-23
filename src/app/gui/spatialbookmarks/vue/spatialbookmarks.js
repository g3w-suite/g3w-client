/**
 * @file
 * @since v3.8
 */
 
import * as vueComponentOptions from 'components/SpatialBookMarks.vue';

import GUI from 'services/gui';

const { inherit, base } = require('utils');
const Component = require('gui/component/component');

const InternalComponent = Vue.extend(vueComponentOptions);

const SpatialBookMarksComponent = function(options = {}) {
  base(this, options);
  this.title = "sdk.spatialbookmarks.title";
  this.setInternalComponent = function () {
    this.internalComponent = new InternalComponent();
    return this.internalComponent;
  };

  GUI.on('closecontent', () => {
    this.state.open = false;
  });

};

inherit(SpatialBookMarksComponent, Component);

module.exports = SpatialBookMarksComponent;


