import TimeSeries from './timeseries.vue';
import Service from '../service';
const {base, inherit} = require('core/utils/utils');
const ProjectRegistry = require('core/project/projectsregistry');
const Component = require('gui/vue/component');

/**
 * Compont Time Series
 * @param options
 * @constructor
 */
function TimeSeriesComponent(options={}) {
  const project = ProjectRegistry.getCurrentProject();
  const timeserieslayers = project.getConfigLayers({
    key: 'timeseries'
  });
  options.visible = timeserieslayers.length > 0; //
  base(this, options);
  this.id = TimeSeries.name;
  this.title= "sdk.timeseries.title";
  const service = new Service({
    layers: timeserieslayers // send layers paramteres
  });
  this.setService(service);
  const InternalComponent = Vue.extend(TimeSeries);
  const internalComponent = new InternalComponent({
    service
  });
  this.setInternalComponent(internalComponent);
  //overwrite _setOpen method component
  this._setOpen = function(bool){
    !bool && service.clear();
  };

  this.unmount = function() {
    service.clear();
    return base(this, 'unmount')
  }
}

inherit(TimeSeriesComponent, Component);

module.exports = TimeSeriesComponent;