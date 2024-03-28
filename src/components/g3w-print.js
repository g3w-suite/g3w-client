/**
 * @file
 * @since 3.10.0
 */

import Component      from 'core/g3w-component';

import * as vueComp   from 'components/Print.vue';

/**
 * ORIGINAL SOURCE: src/app/gui/print/vue/print.js@v3.9.3 
 */
export default function(opts = {}) {
  const comp = new Component({
    ...opts,
    title: 'print',
    service: {},
    internalComponent: new (Vue.extend(vueComp)),
  });

  // BACKCOMP v3.x
  const service             = comp.getService();
  const internalComponent   = comp.getInternalComponent();

  service.state             = internalComponent.state;
  service.changeScale       = internalComponent.changeScale;
  service.getOverviewExtent = internalComponent.getOverviewExtent;
  service.changeRotation    = internalComponent.changeRotation;
  service.changeTemplate    = internalComponent.changeTemplate;
  service.print             = internalComponent.print;
  service.showPrintArea     = internalComponent.showPrintArea;
  service.reload            = internalComponent.reload;

  comp.onafter('setOpen', b => service.showPrintArea(b));
  comp.onafter('reload', () => { service.reload(); comp.state.visible = service.state.visible; });

  return comp;
};