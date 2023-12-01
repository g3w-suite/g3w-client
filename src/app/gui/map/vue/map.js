import * as vueComponentOptions from 'components/Map.vue';

const { base, merge, inherit } = require('utils');
const Component = require('gui/component/component');
const { MapService } = require('gui/map/mapservice');

// interanl registration
const InternalComponent = Vue.extend(vueComponentOptions);

Vue.component('g3w-map', vueComponentOptions);

function MapComponent(options = {}) {
  base(this, options);
  this.id = "map-component";
  this.title = "Map Component";
  const target = options.target || "map";
  const maps_container = options.maps_container || "g3w-maps";
  options.target = target;
  options.maps_container = maps_container;
  const service = new MapService(options);
  this.setService(service);
  merge(this, options);
  this.internalComponent = new InternalComponent({
    service,
    target,
    maps_container
  });
  /**
   * add Vue get cookie method
   *
   */
  service.getCookie = this.internalComponent.$cookie.get;
}

inherit(MapComponent, Component);

const proto = MapComponent.prototype;

proto.layout = function(width, height) {
  $(`#${this.target}`).height(height);
  $(`#${this.target}`).width(width);
  this._service.layout({width, height});
};

module.exports =  MapComponent;