import * as vueComponentOptions from 'components/Metadata.vue';

import GUI from 'services/gui';

const { inherit, base } = require('utils');
const Component = require('gui/component/component');
const MetadataService = require('gui/metadata/metadataservice');

const InternalComponent = Vue.extend(vueComponentOptions);

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


