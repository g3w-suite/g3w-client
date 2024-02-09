/**
 * @file
 * @since 3.10.0
 */

import * as vueComp from 'components/ChangeMapMenu.vue';
import Component    from 'core/g3w-component';

/**
 * ORIGINAL SOURCE: src/app/gui/changemapmenu/changemapmenu.js@v3.9.3 
 */
export default function(opts = {}) {
  return new Component({
    ...opts,
    id: 'changemapmenu',
    visible: true,
    internalComponent: new (Vue.extend(vueComp))(),
  })
};