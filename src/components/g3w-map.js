/**
 * @file
 * @since 3.10.0
 */

import Component    from 'core/g3w-component';

import * as vueComp from 'components/Map.vue';

const { MapService } = require('gui/map/mapservice');

/**
 * ORIGINAL SOURCE: src/app/gui/map/vue/map.js@v3.9.3 
 */
export default function(opts = {}) {
  const comp = new Component({
    ...opts,
    id:                'map',
    title:             'Map Component',
    service:            new MapService(opts),
    vueComponentObject: vueComp,
  })

  comp.layout = (w, h) => { comp.getService().layout({ width: w, height: h }); };

  return comp;
};