import { createCompiledTemplate } from 'gui/vue/utils';
const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const GUI = require('gui/gui');
const Component = require('gui/vue/component');
const Service = require('../relationsservice');
const Field = require('gui/fields/g3w-field.vue');
const getFeaturesFromResponseVectorApi = require('core/utils/geo').getFeaturesFromResponseVectorApi;
const RelationPageEventBus = new Vue();
const compiledTemplate = createCompiledTemplate(require('./relations.html'));

/* List of relations */
const relationsComponent = {
  ...compiledTemplate,
  props: ['relations', 'feature'],
  methods: {
    showRelation: function(relation) {
      this.$parent.showRelation(relation);
    },
    featureInfo: function() {
      let infoFeatures = [];
      let index = 0;
      Object.entries(this.feature.attributes).forEach(([key, value]) => {
        if (index > 2) return false;
        if (value && _.isString(value) && value.indexOf('/') === -1 ) {
          infoFeatures.push({
            key: key,
            value: value
          });
          index+=1;
        }
      });
      return infoFeatures
    }
  },
  mounted() {
    if (this.relations.length === 1) {
      const relation = this.relations[0];
      relation.noback = true;
      this.showRelation(relation);
    }
  },
  beforeDestroy() {
    if (this.relations.length === 1) {
      delete this.relations[0].noback;
    }
  }
};
/*-----------------------------------*/
let relationDataTable;
/* Relation Table */
const relationComponent = {
  template: require('./relation.html'),
  props: ['table', 'relation', 'previousview'],
  inject: ['relationnoback'],
  components: {
    Field
  },
  computed: {
    showrelationslist() {
      return this.previousview === 'relations' && !this.relationnoback;
    },
    one() {
      return this.relation.type === 'ONE'
    }
  },
  methods: {
    saveRelation(){
      this.$emit('save-relation')
    },
    reloadLayout() {
      relationDataTable.columns.adjust();
    },
    back: function() {
      this.$parent.setRelationsList();
    },
    getFieldType: function (value) {
      const Fields = {};
      Fields.SIMPLE = 'simple';
      Fields.LINK = 'link';

      const URLPattern = /^(https?:\/\/[^\s]+)/g;
      if (_.isNil(value)) {
        return Fields.SIMPLE;
      }
      value = value.toString();

      if (value.match(URLPattern)) {
        return Fields.LINK;
      }

      return Fields.SIMPLE;
    },
    fieldIs: function(type, value) {
      const fieldType = this.getFieldType(value);
      return fieldType === type;
    },
    is: function(type,value) {
      return this.fieldIs(type, value);
    }
  },
  created() {
    RelationPageEventBus.$on('reload', () => {
      this.reloadLayout();
    })
  },
  mounted () {
    this.relation.title = this.relation.name;
    this.$nextTick(() => {
      $('.query-relation .header span[data-toggle="tooltip"]').tooltip();
      if (!this.one) {
        const tableHeight = $(".content").height();
        relationDataTable = $('#relationtable').DataTable( {
          "pageLength": 10,
          "bLengthChange": false,
          "scrollY": tableHeight / 2 +  "px",
          "scrollCollapse": true,
          "scrollX": true,
          "order": [ 0, 'asc' ]
        } )
      }
    })
  }
};
/*-----------------------------------*/

const InternalComponent = Vue.extend({
  template: require('./relationspage.html'),
  data: function() {
    return {
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
    'relations': relationsComponent,
    'relation': relationComponent
  },
  methods: {
    saveCSVRelations(){
      this.$options.service.saveCSVRelations();
    },
    reloadLayout() {
      RelationPageEventBus.$emit('reload');
    },
    showRelation: function(relation) {
      this.relation = relation;
      const relationLayerId = relation.referencingLayer;
      const fid = this.feature.attributes['g3w_fid'];
      GUI.setLoadingContent(true);
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


