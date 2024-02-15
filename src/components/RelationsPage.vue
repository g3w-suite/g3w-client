<!--
  @file
  @since v3.7
-->

<template>
  <div class="query-relations-page">
    <component
      :loading         = "loading"
      @save-relation   = "saveRelations"
      @show-chart      = "showChart"
      @hide-chart      = "hideChart"
      :ref             = "currentview"
      :previousview    = "previousview"
      :is              = "currentview"
      :showChartButton = "showChartButton"
      :relations       = "relations"
      :relation        = "relation"
      :nmRelation      = "nmRelation"
      :feature         = "feature"
      :table           = "table"
    />
  </div>
</template>

<script>
import GUI                                  from 'services/gui';
import RelationsComponent                   from 'components/Relations.vue';
import RelationComponent                    from 'components/Relation.vue';
import {
  G3W_FID,
  LIST_OF_RELATIONS_TITLE,
}                                           from 'app/constant';
import { RelationEventBus as VM }           from 'app/eventbus';
import { getFeaturesFromResponseVectorApi } from "utils/getFeaturesFromResponseVectorApi";

export default {

  /** @since 3.8.6 */
  name: 'relation-page',

  data() {

    this.chartRelationIds = this.$options.chartRelationIds || [];

    const {
      table,
      relation=null,
      relations,
      nmRelation,
      feature,
      currentview,
      service
    } = this.$options;

    return {
      loading: false,
      state: null,
      error: false,
      table: table ? service.buildRelationTable(table) : null,
      relation,
      relations,
      nmRelation,
      showChartButton: false,
      feature,
      currentview,
      previousview: currentview
    };

  },

  provide() {
    return {
      relationnoback: (1 === this.$options.relations.length),
    };
  },

  components: {
    'relations': RelationsComponent,
    'relation': RelationComponent
  },

  methods: {

    saveRelations(type) {
      this.$options.service.saveRelations(type);
    },

    reloadLayout() {
      VM.$emit('reload');
    },

    showChart(container, relationData) {
      GUI.getService('queryresults').showChart([this.relation.referencingLayer], container, relationData);
    },

    hideChart(container) {
      GUI.getService('queryresults').hideChart(container)
    },

    async showRelation(relation) {

      GUI.setLoadingContent(true);

      this.loading  = true;
      this.relation = relation;

      let relationLayerId = relation.referencingLayer;

      try {

        const response = await this.$options.service.getRelations({
          relation,
          layer:    this.$options.layer,
          fid:      this.feature.attributes[G3W_FID],
        });

        let relations = getFeaturesFromResponseVectorApi(response, { type: 'result' });

        if (this.nmRelation) {
          relationLayerId = this.nmRelation.referencedLayer;
          relations       = await this.$options.service.getRelationsNM({ nmRelation: this.nmRelation, features: relations });
        }

        this.showChartButton = !!this.chartRelationIds.find(layerId => layerId === relationLayerId);
        this.table           = this.$options.service.buildRelationTable(relations, relationLayerId);

        GUI.changeCurrentContentOptions({
          title: relation.name,
          crumb: {
            title: relation.name
          }
        });

        await this.$nextTick();

        this.previousview = this.currentview;
        this.currentview  = 'relation';

      } catch(err) {
        console.warn(err);
        // manage error here
      }

      GUI.setLoadingContent(false);

      this.loading = true;
    },

    setRelationsList() {
      this.previousview = 'relation';
      this.currentview  = 'relations';
      GUI.changeCurrentContentOptions({ crumb: { title: LIST_OF_RELATIONS_TITLE } });
      this.loading = false;
    },

  },

  beforeMount() {
    if (
      'relation' === this.currentview ||
      (1 === this.relations.length && 'ONE' === this.relations[0].type)
    ) {
      this.showRelation(this.relations[0]);
    }
  },

  async mounted() {

    this.relations.sort((a, b) => (a.name > b.name ? 1 : -1)); // sort relations by name.

    await this.$nextTick();

    if (this.error) {
      requestAnimationFrame(() => { GUI.popContent() });
    }

    this.error = false;

  },

};
</script>