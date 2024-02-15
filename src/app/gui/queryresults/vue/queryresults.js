import * as vueComponentOptions from 'components/QueryResults.vue';

const { base, inherit } = require('utils');
const Component = require('gui/component/component');
const QueryResultsService = require('gui/queryresults/queryresultsservice');

const InternalComponent = Vue.extend(vueComponentOptions);

function QueryResultsComponent(options={}) {
  base(this, options);
  this.id = "queryresults";
  this.title = "Query Results";
  this._service = new QueryResultsService();
  this.setInternalComponent = function() {
    this.internalComponent = new InternalComponent({
      queryResultsService: this._service
    });
    this.internalComponent.querytitle = this._service.state.querytitle;
  };

  this.getElement = function() {
    if (this.internalComponent) return this.internalComponent.$el;
  };

  this._service.onafter('setLayersData', async () => {
    !this.internalComponent && this.setInternalComponent();
    await this.internalComponent.$nextTick();
  });

  this.layout = function(width,height) {};
  this.unmount = function() {
    this.getService().closeComponent();
    return base(this, 'unmount')
  }
}

inherit(QueryResultsComponent, Component);

module.exports = QueryResultsComponent;
