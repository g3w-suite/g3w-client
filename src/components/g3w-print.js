/**
 * @file
 * @since 3.10.0
 */

import Component    from 'core/g3w-component';

import * as vueComp from 'components/Print.vue';

const { PrintComponentService } = require('gui/print/printservice');

/**
 * ORIGINAL SOURCE: src/app/gui/print/vue/print.js@v3.9.3 
 */
export default function(opts = {}) {
  const comp = new Component({
    ...opts,
    title: 'print',
    service: opts.service || new PrintComponentService(),
    vueComponentObject: vueComp,
  });

  comp.state.visible = comp._service.state.visible;

  comp.onafter('setOpen', b => comp._service.showPrintArea(b));
  comp.onafter('reload', () => {
    comp._service.reload();
    comp.state.visible = comp._service.state.visible;
  });

  return comp;
};