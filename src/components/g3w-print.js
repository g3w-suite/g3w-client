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
  comp._service.state             = comp.internalComponent.state;
  comp._service.changeScale       = comp.internalComponent.changeScale;
  comp._service.getOverviewExtent = comp.internalComponent.getOverviewExtent;
  comp._service.changeRotation    = comp.internalComponent.changeRotation;
  comp._service.changeTemplate    = comp.internalComponent.changeTemplate;
  comp._service.print             = comp.internalComponent.print;
  comp._service.showPrintArea     = comp.internalComponent.showPrintArea;
  comp._service.reload            = comp.internalComponent.reload;

  comp.onafter('setOpen', b => comp._service.showPrintArea(b));
  comp.onafter('reload', () => {
    comp._service.reload();
    comp.state.visible = comp._service.state.visible;
  });

  return comp;
};