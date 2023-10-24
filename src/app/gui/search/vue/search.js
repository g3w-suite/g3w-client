import * as vueComponentOptions from 'components/Search.vue';

const { inherit, base } = require('utils');
const Component = require('gui/component/component');
const Service = require('gui/search/service');

const InternalComponent = Vue.extend(vueComponentOptions);

function SearchComponent(options={}){
  base(this, options);
  this.id = "search";
  this._service = options.service || new Service();
  this._service.init();
  this.title = this._service.getTitle();
  this.internalComponent = new InternalComponent({
    service: this._service
  });
  this.internalComponent.state = this._service.state;
  this.state.visible = true;
  this._reload = function() {
    this._service.reload();
  };
  this.unmount = function() {
    this._searches_searchtools.$destroy();
    return base(this, 'unmount');
  }
}

inherit(SearchComponent, Component);

module.exports = SearchComponent;
