import * as vueComponentOptions from 'components/WMS.vue';
import Service from 'gui/wms/service';
import GUI from 'services/gui';

const { base, inherit } = require('utils');
const Component = require('gui/component/component');

const InternalComponent = Vue.extend(vueComponentOptions);

function WmsComponent(options={}) {
  base(this, options);
  this._service = new Service(options);
  this.title = "WMS";

  const internalComponent = new InternalComponent({
    service: this._service
  });

  internalComponent.state = this._service.state;
  this.setInternalComponent(internalComponent);

  this._setOpen = function(bool=false) {
    this.internalComponent.state.open = bool;
    bool && GUI.closeContent();
  }
}

inherit(WmsComponent, Component);

module.exports = WmsComponent;
