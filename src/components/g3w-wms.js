/**
 * @file
 * @since 3.10.0
 */

import Component                         from 'core/g3w-component';
import GUI                               from 'services/gui';

import * as vueComp                      from 'components/WMS.vue';

const { t } = require('core/i18n/i18n.service');

/**
 * ORIGINAL SOURCE:
 * - src/app/gui/wms/vue/wms.js@v3.9.3
 * - src/app/gui/wms/service.js@3.8.15
 */
export default function(opts = {}) {

  const comp = new Component({
    ...opts,
    title: 'sidebar.wms.add_wms_layer',
    service: {},
    internalComponent: new (Vue.extend(vueComp))({ wmsurls: opts.wmsurls }),
  });

  const service             = comp.getService();
  const internalComponent   = comp.getInternalComponent();

  comp._setOpen = (b = false) => {
    internalComponent.state.open = b;
    if (b) {
      GUI.closeContent();
    }
  };

  // BACKCOMP v3.x
  service.state              = internalComponent.state;
  service.addNewUrl          = internalComponent.addNewUrl;
  service.deleteWmsUrl       = internalComponent.deleteWmsUrl;
  service.showWmsLayersPanel = internalComponent._showWmsLayersPanel;
  service.addWMSlayer        = internalComponent.addWMSlayer;
  service.getWMSLayers       = internalComponent.getWMSLayers;
  service.deleteWms          = internalComponent.deleteWms;
  service.clear              = internalComponent.clear;
  service.changeLayerData    = internalComponent.changeLayerData;
  service.getLocalWMSData    = internalComponent.getLocalWMSData;
  service.updateLocalWMSData = internalComponent.updateLocalWMSData;

  return comp;
}