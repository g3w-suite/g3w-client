import utils from 'core/utils/utils';
import Panel from 'gui/panel';
import WMSLayersPanel from './wmslayerspanel.vue';

const WMSLayersPanelComponent = Vue.extend(WMSLayersPanel);

class WmsLayersPanel extends Panel {
  constructor(options = {}) {
    super(options);
    const { service, config } = options;
    this.setService(service);
    this.id = utils.uniqueId();
    this.title = 'sidebar.wms.panel.title';
    const panel = WMSLayersPanelComponent;
    const internalPanel = new panel({
      service,
      config,
    });
    this.setInternalPanel(internalPanel);
  }

  unmount() {
    return super.unmount().then(() => service.clear());
  }
}

export default WmsLayersPanel;
