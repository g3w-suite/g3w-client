<!-- ORIGINAL SOURCE: -->
<!-- gui/relations/vue/relationspage.html@v3.4 -->
<!-- gui/relations/vue/relationspage.js@v3.4 -->

<template>
  <div class="query-relations-page">
      <component :loading="loading" @save-relation="saveRelations" @show-chart="showChart" @hide-chart="hideChart"
        :ref="currentview"
        :previousview="previousview"
        :is="currentview"
        :showChartButton="showChartButton"
        :relations="relations"
        :relation="relation"
        :nmRelation="nmRelation"
        :feature="feature"
        :table="table">
      </component>
  </div>
</template>

<script>
import RelationsComponent from 'components/Relations.vue';
import RelationComponent from 'components/Relation.vue';
import {G3W_FID, LIST_OF_RELATIONS_ID} from 'constant';

const GUI = require('gui/gui');
const {getFeaturesFromResponseVectorApi} = require('core/utils/geo');
const RelationPageEventBus = require('gui/relations/vue/relationeventbus');

export default {
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
    'relations': RelationsComponent,
    'relation': RelationComponent
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
      if (GUI.getCurrentContentId() === LIST_OF_RELATIONS_ID) GUI.changeCurrentContentTitle(relation.name);
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
    /**
     * Order relations by name
     */
    this.relations.sort(({name:relationName1}, {name:relationName2}) => {
      if (relationName1 < relationName2) return -1;
      if (relationName1 > relationName2) return 1;
      return 0;
    });

    await this.$nextTick();
    if (this.error)
      requestAnimationFrame(() => {
        GUI.popContent()
      });
    this.error = false;
  }
};
</script>