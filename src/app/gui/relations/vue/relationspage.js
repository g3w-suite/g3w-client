import {G3W_FID} from 'constant';
import { createCompiledTemplate } from 'gui/vue/utils';
const {base, inherit} = require('core/utils/utils');
const GUI = require('gui/gui');
const Component = require('gui/vue/component');
const Service = require('../relationsservice');
const { getFeaturesFromResponseVectorApi } = require('core/utils/geo');
const RelationPageEventBus = require('./relationeventbus');
const compiledTemplate = createCompiledTemplate(require('./relationspage.html'));

const InternalComponent = Vue.extend({
  ...compiledTemplate,
  data() {
    this. chartRelationIds = this.$options.chartRelationIds || [];
    return {
      loading: false,
      state: null,
      error: false,
      table: this.$options.table ? this.$options.service.buildRelationTable(this.$options.table) : null,
      relation: this.$options.relation || null,
      relations: this.$options.relations,
      showChartButton: false,
      feature: this.$options.feature,
      currentview: this.$options.currentview,
      previousview: this.$options.currentview
    }
  },
  provide() {
    return {
      relationnoback: this.$options.relations.length === 1
    }
  },
  components: {
    'relations': require('./relations'),
    'relation': require('./relation')
  },
  methods: {
    saveRelations(type){
      this.$options.service.saveRelations(type)
    },
    reloadLayout() {
      RelationPageEventBus.$emit('reload');
    },
    showChart(container, relationData){
      const relationLayerId = this.relation.referencingLayer;
      GUI.getComponent('queryresults').getService().showChart([relationLayerId], container, relationData)
    },
    hideChart(container){
      GUI.getComponent('queryresults').getService().hideChart(container)
    },
    showRelation(relation) {
      GUI.setLoadingContent(true);
      this.loading = true;
      this.relation = relation;
      const relationLayerId = relation.referencingLayer;
      const fid = this.feature.attributes[G3W_FID];
      this.$options.service.getRelations({
        layer: this.$options.layer,
        relation,
        fid
      }).then(response => {
        const relations = getFeaturesFromResponseVectorApi(response);
        this.showChartButton = !!this.chartRelationIds.find(chartlayerid => chartlayerid === relationLayerId);
        this.table = this.$options.service.buildRelationTable(relations, relationLayerId);
        this.currentview = 'relation';
        this.previousview = 'relations';
      }).catch(err => {
      }).finally(() => {
        GUI.setLoadingContent(false);
        this.loading = true;
      })
    },
    setRelationsList() {
      this.previousview = 'relation';
      this.currentview = 'relations';
      this.loading = false;
    }
  },
  beforeMount () {
    if (this.relations.length === 1 && this.relations[0].type === 'ONE')  this.showRelation(this.relations[0])
  },
  async mounted() {
    await this.$nextTick();
    if (this.error)
      requestAnimationFrame(() => {
        GUI.popContent()
      });
    this.error = false;
  }
});

const RelationsPage = function(options={}) {
  base(this, options);
  const service = options.service || new Service();
  const {layer, relation=null, relations=[], feature=null, table=null, chartRelationIds=[]} = options;
  const currentview = options.currentview || 'relations';
  this.setService(service);
  const internalComponent = new InternalComponent({
    previousview: currentview,
    service,
    relations,
    relation,
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


