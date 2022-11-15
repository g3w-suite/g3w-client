import * as vueComponentOptions from 'components/QTimeseries.vue';

import Service from 'services/qtimeseries';
const {base, inherit} = require('core/utils/utils');
const Component = require('gui/component/component');

const InternalComponent = Vue.extend(vueComponentOptions);

function QTimeseriesComponent(options={}) {
  base(this, options);
  this.setVisible(Service.getLayers().length > 0);
  this.title = "qtimeseries.title";
  const internalComponent = new InternalComponent({});
  this.setInternalComponent(internalComponent);
  this._setOpen = function(bool=false) {
    this.internalComponent.state.open = bool;
  }
}

inherit(QTimeseriesComponent, Component);

module.exports = QTimeseriesComponent;
