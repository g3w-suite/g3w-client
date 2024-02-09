/**
 * @file
 * @since 3.10.0
 */

import * as vueComp from 'components/Map.vue';
import Component    from 'core/g3w-component';

const { MapService } = require('gui/map/mapservice');

Vue.component('g3w-map', vueComp);

/**
 * ORIGINAL SOURCE: src/app/gui/map/vue/map.js@v3.9.3 
 */
export default function(opts = {}) {
  opts.target         = opts.target || "map";
  opts.maps_container = opts.maps_container || "g3w-maps";

  const service       = new MapService(opts);

  const comp          = new Component({
    id: 'map',
    title: 'Map Component',
    service,
    internalComponent: new (Vue.extend(vueComp))({ service, target: opts.target, maps_container: opts.maps_container })
  })

  service.getCookie = comp.internalComponent.$cookie.get; // add Vue get cookie method

  comp.layout = (width, height) => {
    const el = document.getElementById(comp.target);
    if (el) {
      el.style.height = height + 'px';
      el.style.width  = width + 'px';
    }
    comp._service.layout({ width, height });
  };

  return comp;
};