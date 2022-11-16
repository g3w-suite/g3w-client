import * as vueComponentOptions from 'components/QTimeseries.vue';

const {base, inherit} = require('core/utils/utils');
const ProjectsRegistry = require('core/project/projectsregistry');
const Component = require('gui/component/component');

const InternalComponent = Vue.extend(vueComponentOptions);

function QTimeseriesComponent(options={}) {
  const layers = ProjectsRegistry.getCurrentProject().getQtimeseriesLayers();
  // set visible attribute based on qtimelayers
  options.visible = layers.length > 0;
  base(this, options);
  this.title = "qtimeseries.title";
  const internalComponent = new InternalComponent({
    layers
  });
  this.setInternalComponent(internalComponent);
  this._setOpen = function(bool=false) {
    this.internalComponent.$emit('show', bool);
  }
}

inherit(QTimeseriesComponent, Component);

module.exports = QTimeseriesComponent;
