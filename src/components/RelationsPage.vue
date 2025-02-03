<!--
  @file
  @since v3.7
-->

<template>
  <div class = "query-relations-page">
    <component
      :loading           = "loading"
      @show-chart        = "showChart"
      @hide-chart        = "hideChart"
      :ref               = "currentview"
      :previousview      = "previousview"
      :is                = "currentview"
      :relations         = "relations"
      :relation          = "relation"
      :feature           = "feature"
      :layer             = "layer"
      :chartRelationIds  = "chartRelationIds"
      :showrelationslist = "showrelationslist"
    />
  </div>
</template>

<script>
import { VM }                                   from 'g3w-eventbus';
import GUI                                      from "services/gui";
import RelationsComponent                       from 'components/Relations.vue';
import RelationComponent                        from 'components/Relation.vue';

export default {

  /** @since 3.8.6 */
  name: 'relation-page',

  data() {
    const {
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
      previousview:    currentview,
      feature,
      currentview,
      relation,
      relations,
      nmRelation,
      chartRelationIds,
      layer,
    }
  },
  components: {
    'relations': RelationsComponent,
    'relation':  RelationComponent
  },
  computed: {
    showrelationslist() {
      return 'relations' === this.previousview && this.relations.length > 1;
    }
  },
  methods: {

    reloadLayout() {
      VM.$emit('reload-relations');
    },
    showChart(container, relationData) {
      GUI.getService('queryresults').showChart([this.relation.referencingLayer], container, relationData)
    },
    hideChart(container) {
      GUI.getService('queryresults').hideChart(container)
    },

    async showRelation(relation) {
      this.loading        = true;
      this.relation       = relation;
      try {
        GUI.setCurrentContentOptions({
          title: relation.name,
          crumb: { title: relation.name, text: true }/**@since 3.11.0 text attribute */
        });
        await this.$nextTick();
        this.previousview = this.currentview;
        this.currentview  = 'relation';
      } catch(e) {
        console.warn(e);
      }

      this.loading = true;
    },
    setRelationsList() {
      this.previousview = 'relation';
      this.currentview  = 'relations';
      GUI.setCurrentContentOptions({ crumb: { title: 'info.list_of_relations' } });
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