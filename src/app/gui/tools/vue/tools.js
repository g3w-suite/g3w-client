import * as vueComponentOptions from 'components/Tools.vue';
import GUI from 'services/gui';

const { base, inherit } = require('utils');
const Component = require('gui/component/component');
const ToolsService = require('gui/tools/service');

const InternalComponent = Vue.extend(vueComponentOptions);

function ToolsComponent(options={}) {
  base(this, options);
  this._service = new ToolsService(options);
  this.title = "tools";

  const internalComponent = new InternalComponent({
    toolsService: this._service
  });

  internalComponent.state = this._service.state;
  this.setInternalComponent(internalComponent, {
    events: [{name: 'visible'}]
  });

  this._setOpen = function(bool=false) {
    this.internalComponent.state.open = bool;
    bool && GUI.closeContent();
  }
}

inherit(ToolsComponent, Component);

module.exports = ToolsComponent;
