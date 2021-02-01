const t = require('core/i18n/i18n.service').t;
const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const GUI = require('gui/gui');
const Component = require('gui/vue/component');
const TableService = require('../tableservice');
import Table from './Table.vue';

const InternalComponent = Vue.extend(Table);

const TableComponent = function(options = {}) {
  base(this);
  this.id = "openattributetable";
  const layer = options.layer;
  const formatter = options.formatter;
  const service = options.service || new TableService({
    layer,
    formatter
  });

  this.setService(service);
  const internalComponent = new InternalComponent({
    service
  });

  this.setInternalComponent(internalComponent);
  internalComponent.state = service.state;

  service.on('redraw', ()=>{
    this.layout();
  });

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
    .catch(err => GUI.notify.error(t("info.server_error")))
    .finally(() => this.emit('show'));
};

proto.unmount = function() {
  return base(this, 'unmount').then(() => {
    this._service.clear();
  })
};


module.exports = TableComponent;


