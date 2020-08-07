import { createCompiledTemplate } from 'gui/vue/utils';
const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const GUI = require('gui/gui');
const Component = require('gui/vue/component');
const Service = require('../relationsservice');
const getFeaturesFromResponseVectorApi = require('core/utils/geo').getFeaturesFromResponseVectorApi;
const RelationPageEventBus = require('./relationeventbus');
const compiledTemplate = createCompiledTemplate(require('./relationspage.html'));

const InternalComponent = Vue.extend({
  ...compiledTemplate,
  data: function() {
    return {
      loading: false,
      state: null,
      error: false,
      table: this.$options.table ? this.$options.service.buildRelationTable(this.$options.table) : null,
      relation: this.$options.relation || null,
      relations: this.$options.relations,
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
        .then(response =>{})
        .catch(error =>{});
    },
    reloadLayout() {
      RelationPageEventBus.$emit('reload');
    },
    showRelation: function(relation) {
      GUI.setLoadingContent(true);
      this.loading = true;
      this.relation = relation;
      const relationLayerId = relation.referencingLayer;
      const fid = this.feature.attributes['g3w_fid'];
      this.$options.service.getRelations({
        layer: this.$options.layer,
        relation,
        fid
      }).then((response) => {
        const relations = getFeaturesFromResponseVectorApi(response);
        this.table = this.$options.service.buildRelationTable(relations, relationLayerId);
        this.currentview = 'relation';
        this.previousview = 'relations';
      }).catch((err) => {
      }).finally(() => {
        GUI.setLoadingContent(false);
        this.loading = true;
      })
    },
    setRelationsList: function() {
      this.previousview = 'relation';
      this.currentview = 'relations';
    }
  },
  beforeMount () {
    if (this.relations.length === 1 && this.relations[0].type === 'ONE')  this.showRelation(this.relations[0])
  },
  mounted() {
    this.$nextTick(()=> {
      if (this.error)
        requestAnimationFrame(() => {
          GUI.popContent()
        });
      this.error = false;
    });
  }
});

const RelationsPage = function(options={}) {
  base(this);
  const service = options.service || new Service();
  const {layer, relation=null, relations=[], feature=null, table=null} = options;
  const currentview = options.currentview || 'relations';
  this.setService(service);
  const internalComponent = new InternalComponent({
    previousview: currentview,
    service,
    relations,
    relation,
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


