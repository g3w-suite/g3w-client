import { t } from 'core/i18n/i18n.service';
import GUI from 'gui/gui';
import Component from 'gui/vue/component';
import TableService from 'gui/table/tableservice';
import Table from './Table.vue';

const InternalComponent = Vue.extend(Table);

class TableComponent extends Component {
  constructor(options = {}) {
    super(options);
    this.id = 'openattributetable';
    const { layer, formatter } = options;
    const service = options.service || new TableService({
      layer,
      formatter,
    });

    this.setService(service);
    const internalComponent = new InternalComponent({
      service,
    });

    this.setInternalComponent(internalComponent);
    internalComponent.state = service.state;

    service.on('redraw', () => {
      this.layout();
    });
  }

  layout() {
    internalComponent.reloadLayout();
  }

  // overwrite show method
  show(options = {}) {
    const service = this.getService();
    // close all sidebar open component
    GUI.closeOpenSideBarComponent();
    service.getData({ firstCall: true })
      .then(() => {
        GUI.showContent({
          content: this,
          perc: 50,
          split: GUI.isMobile() ? 'h' : 'v',
          push: false,
          title: options.title,
        });
      })
      .catch((err) => GUI.notify.error(t('info.server_error')))
      .finally(() => this.fire('show'));
  }

  unmount() {
    return super.unmount().then(() => this._service.clear());
  }
}

export default TableComponent;
