/**
 * @file
 * @since 3.10.0
 */

import Component                         from 'core/g3w-component';
import GUI                               from 'services/gui';

import * as vueComp                      from 'components/WMS.vue';

/**
 * ORIGINAL SOURCE:
 * - src/app/gui/wms/vue/wms.js@v3.9.3
 * - src/app/gui/wms/service.js@3.8.15
 */
export default function(opts = {}) {

  const comp = new Component({
    ...opts,
    title: 'WMS',
    service: {},
    internalComponent: new (Vue.extend(vueComp))({ wmsurls: opts.wmsurls }),
  });

  comp._setOpen = (b = false) => {
    comp.internalComponent.state.open = b;
    if (b) {
      GUI.closeContent();
    }
  };

  // BACKCOMP v3.x
  comp._service.state              = comp.internalComponent.state;
  comp._service.addNewUrl          = comp.internalComponent.addNewUrl;
  comp._service.deleteWmsUrl       = comp.internalComponent.deleteWmsUrl;
  comp._service.showWmsLayersPanel = comp.internalComponent._showWmsLayersPanel;
  comp._service.addWMSlayer        = comp.internalComponent.addWMSlayer;
  comp._service.getWMSLayers       = comp.internalComponent.getWMSLayers;
  comp._service.deleteWms          = comp.internalComponent.deleteWms;
  comp._service.clear              = comp.internalComponent.clear;
  comp._service.changeLayerData    = comp.internalComponent.changeLayerData;
  comp._service.getLocalWMSData    = comp.internalComponent.getLocalWMSData;
  comp._service.updateLocalWMSData = comp.internalComponent.updateLocalWMSData;

  return comp;
}