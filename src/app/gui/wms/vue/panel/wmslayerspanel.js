import * as vueComponentOptions from 'components/WMSLayersPanel.vue';

const { base, inherit, uniqueId } = require('utils');
const Panel = require('gui/panel');

const WMSLayersPanelComponent = Vue.extend(vueComponentOptions);

function WmsLayersPanel(options = {}) {
  const {service, config} = options;
  this.setService(service);
  this.id = uniqueId();
  this.title = 'sidebar.wms.panel.title';
  const panel = WMSLayersPanelComponent;
  const internalPanel = new panel({
    service,
    config
  });
  this.setInternalPanel(internalPanel);
  this.unmount = function() {
    return base(this, 'unmount').then(() => {
      service.clear()
    })
  }
}

inherit(WmsLayersPanel, Panel);

export default WmsLayersPanel;
