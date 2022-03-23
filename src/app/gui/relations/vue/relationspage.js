import {G3W_FID, LIST_OF_RELATIONS_TITLE} from 'constant';
import {createCompiledTemplate} from 'gui/vue/utils';
const {base, inherit} = require('core/utils/utils');
const GUI = require('gui/gui');
const Component = require('gui/vue/component');
const Service = require('../relationsservice');
const {getFeaturesFromResponseVectorApi} = require('core/utils/geo');
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
      nmRelation: this.$options.nmRelation,
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
      GUI.getService('queryresults').showChart([relationLayerId], container, relationData)
    },
    hideChart(container){
      GUI.getService('queryresults').hideChart(container)
    },
    async showRelation(relation) {
      GUI.setLoadingContent(true);
      if (GUI.getCurrentContentTitle() === LIST_OF_RELATIONS_TITLE)
        GUI.changeCurrentContentTitle(relation.name);
      this.loading = true;
      this.relation = relation;
      let relationLayerId = relation.referencingLayer;
      const fid = this.feature.attributes[G3W_FID];
      try {
        const response = await this.$options.service.getRelations({
          layer: this.$options.layer,
          relation,
          fid
        });
        let relations = getFeaturesFromResponseVectorApi(response, {
          type: 'result'
        });
        if (this.nmRelation) {
          relationLayerId = this.nmRelation.referencedLayer;
          relations = await this.$options.service.getRelationsNM({
            nmRelation: this.nmRelation,
            features: relations
          });
        }
        this.showChartButton = !!this.chartRelationIds.find(chartlayerid => chartlayerid === relationLayerId);
        this.table = this.$options.service.buildRelationTable(relations, relationLayerId);
        this.currentview = 'relation';
        this.previousview = 'relations'
      } catch(err){
        // manage error here
      }
      GUI.setLoadingContent(false);
      this.loading = true;
    },
    setRelationsList() {
      this.previousview = 'relation';
      this.currentview = 'relations';
      this.loading = false;
    }
  },
  beforeMount() {
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
  const {layer, relation=null, relations=[], feature=null, table=null, chartRelationIds=[], nmRelation} = options;
  const currentview = options.currentview || 'relations';
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


