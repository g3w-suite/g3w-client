import WMS from './wms.vue';
import Service from '../service';
const {base, inherit} = require('core/utils/utils');
const GUI = require('gui/gui');
const Component = require('gui/vue/component');
const InternalComponent = Vue.extend(WMS);

function ToolsComponent(options={}) {
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

inherit(ToolsComponent, Component);

module.exports = ToolsComponent;
