/**
 * @file
 * @since 3.10.0
 */

import Component from 'core/g3w-component';

import * as vueComp from 'components/RelationsPage.vue';

/**
 * ORIGINAL SOURCE:
 * - src/app/gui/relations/vue/relationspage.js@v3.9.3
 * - src/app/gui/relations/relationsservice.js@v3.9.3
 */
export default function(opts = {}) {
  return new Component({
    ...opts,
    internalComponent: new (Vue.extend(vueComp))(opts)
  });
};