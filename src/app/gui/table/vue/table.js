import Table from 'components/Table.vue';
import GUI   from 'services/gui';

const { t }             = require('core/i18n/i18n.service');
const { base, inherit } = require('utils');
const Component         = require('gui/component/component');
const TableService      = require('gui/table/tableservice');

const InternalComponent = Vue.extend(Table);

const TableComponent = function(options = {}) {
  base(this);
  this.id                    = "openattributetable";
  const { layer, formatter } = options;
  const service              = options.service || new TableService({ layer, formatter});

  this.setService(service);
  const internalComponent = new InternalComponent({
    service
  });

  this.setInternalComponent(internalComponent);
  internalComponent.state = service.state;

  service.on('redraw', () => this.layout());

  this.unmount = function() {
    return base(this, 'unmount')
  };

  this.layout = function() {
    internalComponent.reloadLayout();
  };
};

inherit(TableComponent, Component);

const proto = TableComponent.prototype;

// overwrite show method
proto.show = function(options = {}) {
  const service = this.getService();
  // close all sidebar open component
  GUI.closeOpenSideBarComponent();
  service.getData({firstCall: true})
    .then(() => {
      GUI.showContent({
        content: this,
        perc: 50,
        split: GUI.isMobile() ? 'h': 'v',
        push: false,
        title: options.title
      });
    })
    .catch(err => {
      GUI.notify.error(t("info.server_error"));
      console.warn(err);
    })
    .finally(() => this.emit('show'));
};

proto.unmount = function() {
  return base(this, 'unmount').then(() => {
    this._service.clear();
  })
};

module.exports = TableComponent;


