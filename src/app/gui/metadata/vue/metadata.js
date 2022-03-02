import { createCompiledTemplate } from 'gui/vue/utils';
const {inherit, base} = require('core/utils/utils');
const Component = require('gui/vue/component');
const GUI = require('gui/gui');
const MetadataService = require('gui/metadata/metadataservice');
const templateCompiled = createCompiledTemplate(require('./metadata.html'));

const InternalComponent = Vue.extend({
  ...templateCompiled,
  data() {
    return {
      state: null
    }
  }
});

const MetadataComponent = function(options = {}) {
  base(this, options);
  this.title = "sdk.metadata.title";
  const service = options.service || new MetadataService(options);
  this.setService(service);
  this._service.on('reload', () => {
    this.setOpen(false);
  });
  this.setInternalComponent = function () {
    this.internalComponent = new InternalComponent({
      service: service
    });
    this.internalComponent.state = service.state;
    return this.internalComponent;
  };
  this._setOpen = function(bool) {
    this._service.showMetadata(bool);
  };
  GUI.on('closecontent', ()=>{
    this.state.open = false;
  })
};

inherit(MetadataComponent, Component);

module.exports = MetadataComponent;


