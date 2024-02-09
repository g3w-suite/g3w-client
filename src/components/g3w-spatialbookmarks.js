/**
 * @file
 * @since 3.10.0
 */

import * as vueComp from 'components/SpatialBookMarks.vue';
import Component    from 'core/g3w-component';
import GUI          from 'services/gui';

/**
 * ORIGINAL SOURCE: src/app/gui/spatialbookmarks/vue/spatialbookmarks.js@v3.9.3
 */
export default function (opts = {}) {
  const comp = new Component({
    ...opts,
    title: 'sdk.spatialbookmarks.title',
    internalComponent: new (Vue.extend(vueComp))(),
  });

  GUI.on('closecontent', () => { comp.state.open = false; });

  return comp;
};