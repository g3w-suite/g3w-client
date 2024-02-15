import * as vueComponentOptions from 'components/PrintPage.vue';

const { inherit, base }         = require('utils');
const Component                 = require('gui/component/component');

const InternalComponent         = Vue.extend(vueComponentOptions);

const PrintPage = function(options={}) {
  base(this);
  const service = options.service;
  this.setService(service);
  const internalComponent = new InternalComponent({
    service
  });
  this.setInternalComponent(internalComponent);
  this.internalComponent.state = service.state.output;

  this.unmount = function() {
    this.getService().setPrintAreaAfterCloseContent();
    return base(this, 'unmount')
  }
};

inherit(PrintPage, Component);


module.exports = PrintPage;


