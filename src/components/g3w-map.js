/**
 * @file
 * @since 3.10.0
 */

import Component    from 'core/g3w-component';

import * as vueComp from 'components/Map.vue';

const { MapService } = require('gui/map/mapservice');

Vue.component('g3w-map', vueComp);

/**
 * ORIGINAL SOURCE: src/app/gui/map/vue/map.js@v3.9.3 
 */
export default function(opts = {}) {
  const service       = new MapService(opts);
  const comp          = new Component({
    id: 'map',
    title: 'Map Component',
    service,
    internalComponent: new (Vue.extend(vueComp))({ service })
  })

  comp.layout = (w, h) => {
    const el = document.getElementById(comp.target);
    if (el) {
      el.style.height = h + 'px';
      el.style.width  = w + 'px';
    }
    comp._service.layout({ width: w, height: h });
  };

  return comp;
};