import * as vueComponentOptions from 'components/Print.vue';

const { inherit, base }         = require('utils');
const Component                 = require('gui/component/component');
const { PrintComponentService } = require('gui/print/printservice');

function PrintComponent(options={}) {
  base(this, options);
  this.title = "print";
  this.vueComponent = vueComponentOptions;
  this.internalComponent = null;
  const service = options.service || new PrintComponentService;
  this.setService(service);
  // init service
  this._service.init();
  this.setInternalComponent = function() {
    const InternalComponent = Vue.extend(this.vueComponent);
    this.internalComponent = new InternalComponent({
      service
    });
    this.state.visible = service.state.visible;
    this.internalComponent.state = service.state;
    return this.internalComponent;
  };

  this._reload = function() {
    const service = this.getService();
    service.reload();
    this.state.visible = service.state.visible;
  };

  this._setOpen = function(bool) {
    this._service.showPrintArea(bool);
  };
}

inherit(PrintComponent, Component);

module.exports = PrintComponent;


