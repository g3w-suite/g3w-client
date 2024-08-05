<!--
  @file
  @since v3.7
-->

<template>
  <div class = "query-relations-page">
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
      :table           = "table"/>
  </div>
</template>

<script>
import GUI                                  from "services/gui";
import RelationsComponent                   from "components/Relations.vue";
import RelationComponent                    from "components/Relation.vue";
import {
  G3W_FID,
  LIST_OF_RELATIONS_TITLE,
}                                           from "app/constant";
import { RelationEventBus as VM }           from "app/eventbus";
import { getFeaturesFromResponseVectorApi } from "utils/getFeaturesFromResponseVectorApi";
import RelationsService                     from 'services/relations';
import ApplicationService                   from 'services/application';

let _options;

function _buildRelationTable(relations = [], id) {
  relations = relations || [];
  const layer = ApplicationService.getCurrentProject().getLayerById(id);
  const attrs = Object.keys(relations[0] ? relations[0].attributes : {});
  const cols  = layer.getTableHeaders().filter(h => -1 !== attrs.indexOf(h.name));
  return {
    columns:          cols.map(c => c.label),
    rows:             relations.map(r => cols.map(c => r.attributes[c.name])),
    rows_fid:         relations.map(r => r.attributes[G3W_FID]),
    features:         relations,
    fields:           cols.length ? cols : null,
    formStructure:    layer.getLayerEditingFormStructure(),
    rowFormStructure: null,
    layerId:          layer.getId()
  };
}

export default {

  /** @since 3.8.6 */
  name: 'relation-page',

  data() {
    const {
      table =            null,
      relation =         null,
      relations =        [],
      nmRelation,
      feature =           null,
      currentview =      'relations',
      chartRelationIds = [],
      layer,
    } = this.$options;
    return {
      loading:         false,
      state:           null,
      error:           false,
      table:           table ? _buildRelationTable(table) : null,
      previousview:    currentview,
      showChartButton: false,
      feature,
      currentview,
      relation,
      relations,
      nmRelation,
      chartRelationIds,
      layer,
    }
  },
  provide() {
    return {
      relationnoback: 1 === this.$options.relations.length
    }
  },
  components: {
    'relations': RelationsComponent,
    'relation':  RelationComponent
  },
  methods: {
    async saveRelations(type) {
      const id = ApplicationService.setDownload(true);
      try      { await RelationsService.save(Object.assign(_options, { type })) }
      catch(e) { console.warn(e); GUI.showUserMessage({ type: 'alert', message: e || 'info.server_error', closable: true }); }
      ApplicationService.setDownload(false, id);
    },
    reloadLayout() {
      VM.$emit('reload');
    },
    showChart(container, relationData) {
      GUI.getService('queryresults').showChart([this.relation.referencingLayer], container, relationData)
    },
    hideChart(container) {
      GUI.getService('queryresults').hideChart(container)
    },
    async showRelation(relation) {
      GUI.setLoadingContent(true);
      this.loading        = true;
      this.relation       = relation;
      let relationLayerId = relation.referencingLayer;
      try {
        _options = {
          layer: this.$options.layer,
          fid:   this.feature.attributes[G3W_FID],
          relation,
        };
        const response = await RelationsService.getRelations(_options);
        let relations = getFeaturesFromResponseVectorApi(response, { type: 'result' });
        if (this.nmRelation) {
          relationLayerId = this.nmRelation.referencedLayer;
          relations = await RelationsService.getRelationsNM({
            nmRelation: this.nmRelation,
            features:   relations
          });
        }
        this.showChartButton = !!this.chartRelationIds.find(id => relationLayerId === id);
        this.table           = _buildRelationTable(relations, relationLayerId);

        GUI.changeCurrentContentOptions({
          title: relation.name,
          crumb: { title: relation.name }
        });

        await this.$nextTick();
        this.previousview = this.currentview;
        this.currentview = 'relation';
      } catch(e) { console.warn(e); }
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
    if ('relation' === this.currentview  || (1 === this.relations.length && 'ONE' === this.relations[0].type)) {
      this.showRelation(this.relations[0])
    }
  },
  async mounted() {
    /**
     * Order relations by name
     */
    this.relations.sort(({ name: relationName1 }, { name: relationName2 }) => {
      if (relationName1 < relationName2) return -1;
      if (relationName1 > relationName2) return 1;
      return 0;
    });
    await this.$nextTick();
    if (this.error) { requestAnimationFrame(() => GUI.popContent()) }
    this.error = false;
  },
  created() {
    this.$on('resize-component', this.reloadLayout);
  }
};
</script>