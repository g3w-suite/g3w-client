import * as vueComponentOptions from 'components/RelationsPage.vue';

const { base, inherit } = require('utils');
const Component = require('gui/component/component');
const Service = require('gui/relations/relationsservice');

const InternalComponent = Vue.extend(vueComponentOptions);

const RelationsPage = function(options={}) {
  base(this, options);
  const service = options.service || new Service();
  const {layer, relation=null, relations=[], feature=null, table=null, chartRelationIds=[], nmRelation, currentview="relations"} = options;
  this.setService(service);
  const internalComponent = new InternalComponent({
    previousview: currentview,
    service,
    relations,
    relation,
    nmRelation,
    chartRelationIds,
    feature,
    currentview,
    layer,
    table
  });
  this.setInternalComponent(internalComponent);
  internalComponent.state = service.state;
  this.layout = function() {
    internalComponent.reloadLayout();
  };
};

inherit(RelationsPage, Component);

module.exports = RelationsPage;


