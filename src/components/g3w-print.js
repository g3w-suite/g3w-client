/**
 * @file
 * @since 3.10.0
 */

import * as vueComp from 'components/Print.vue';
import Component    from 'core/g3w-component';

const { PrintComponentService } = require('gui/print/printservice');

/**
 * ORIGINAL SOURCE: src/app/gui/print/vue/print.js@v3.9.3 
 */
export default function(opts = {}) {
  const comp = new Component({
    ...opts,
    title: 'print',
    service: opts.service || new PrintComponentService
  });

  comp.vueComponent = vueComp;

  comp._service.init();

  comp.setInternalComponent(new (Vue.extend(comp.vueComponent))({ service: comp._service }));  
  comp.state.visible = comp._service.state.visible;

  comp._reload = () => {
    comp._service.reload();
    comp.state.visible = comp._service.state.visible;
  };
  comp._setOpen = b => { comp._service.showPrintArea(b); };

  return comp;
};