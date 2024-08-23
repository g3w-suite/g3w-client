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

  //@since 3.11.0 use internal methods called by component setters if declared
  comp._setOpen = (bool) => comp.getService().showPrintArea(bool);
  comp._reload = () => { comp.getService().reload(); comp.state.visible = service.state.visible; }

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

  return comp;
};