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
      :page            = "page"
      :page_size       = "page_size"
      :table           = "table"/>
  </div>
</template>

<script>
import { G3W_FID, TIMEOUT, PAGELENGTHS }        from 'g3w-constants';
import { VM }                                   from 'g3w-eventbus';
import ApplicationState                         from 'store/application';
import GUI                                      from "services/gui";
import RelationsComponent                       from 'components/Relations.vue';
import RelationComponent                        from 'components/Relation.vue';

import DataRouterService                        from 'services/data';
import { getAlphanumericPropertiesFromFeature } from 'utils/getAlphanumericPropertiesFromFeature';
import { XHR }                                  from 'utils/XHR';
import { saveBlob }                             from 'utils/saveBlob';
import { createRelationsUrl }                   from 'utils/createRelationsUrl';
import { getCatalogLayerById }                  from 'utils/getCatalogLayerById';

let _options;

function _buildRelationTable(relations = [], id) {
  relations = relations || [];
  const layer = ApplicationState.project.getLayerById(id);
  const attrs = Object.keys(relations[0] ? relations[0].attributes : {});
  const cols  = layer.getTableHeaders().filter(h => attrs.includes(h.name));
  return {
    columns:          cols.map(c => c.label),
    rows:             relations.map(r => cols.map(c => r.attributes[c.name])),
    rows_fid:         relations.map(r => r.attributes[G3W_FID]),
    features:         relations,
    fields:           cols.length ? cols : null,
    formStructure:    layer.getLayerEditingFormStructure(),
    rowFormStructure: null,
    layerId:          layer.getId(),
    title:            layer.getName() || layer.getTitle(), //@since 3.11.0
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
      page,
      page_size,
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
      page: page || 1,
      page_size: page_size || PAGELENGTHS[0],
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
      ApplicationState.download = true;

      try {

        const response = await fetch(createRelationsUrl(Object.assign(_options, { type })), {
          headers: { 'Access-Control-Expose-Headers': 'Content-Disposition' }, // get filename from server
          signal:  AbortSignal.timeout(TIMEOUT),
        });

        if (!response?.ok) {
          throw (await response.json()).message;
        }

        saveBlob(await response.blob(), response.headers.get('content-disposition').split('filename=').at(-1));

      } catch(e) {
        console.warn(e);
        GUI.showUserMessage({
          type: 'alert',
          message: e || 'info.server_error',
          closable: true,
        });
      }

      ApplicationState.download = false;
    },

    reloadLayout() {
      VM.$emit('reload-relations');
    },
    showChart(container, relationData) {
      GUI.getService('queryresults').showChart([this.relation.referencingLayer], container, relationData)
    },
    hideChart(container) {
      GUI.getService('queryresults').hideChart(container)
    },

    /**
     * ORIGINAL SOURCE: src/services/relations.js@v3.10.2
     * 
     * Get relations NM
     * 
     * @param nmRelation
     * @param features
     * 
     * @returns {Promise<[]>}
     * 
     * @since 3.11.0
     */
    async getRelationsNM({ nmRelation, features = [] } = {}) {
      const {
        referencedLayer,
        fieldRef: { referencingField, referencedField }
      }               = nmRelation;
      let relationsNM = []; // start with an empty relations result
      if (features.length) {
        const values   = features.map(f => f.attributes[referencingField]);
        const { data } = await DataRouterService.getData('search:features', {
          inputs: {
            layer:     getCatalogLayerById(referencedLayer),
            filter:    values.map(v => `${referencedField}|eq|${encodeURIComponent(v)}`).join(`|OR,`),
            formatter: 1, // set formatter to
          },
          outputs: null
        });
        if (data && data[0] && Array.isArray(data[0].features)) {
          relationsNM = data[0].features.map(f => {
            return {
              id:         f.getId(),
              geometry:   f.getGeometry(),
              attributes: getAlphanumericPropertiesFromFeature(f.getProperties()).reduce((accumulator, property) => {
                accumulator[property] = f.get(property);
                return accumulator;
              }, {}),
            }
          })
        }
      }
      return relationsNM;
    },

    /**
     * @since 3.11.2
     * Used to get relation data and set table
     */
    async setRelationDataTable({
      page,
      page_size,
    } = {}) {
      try {
        let relationLayerId = this.relation.referencingLayer;
        let features;

        const response = await XHR.get({
          url: createRelationsUrl({
            layer:    this.$options.layer,
            fid:      this.feature.attributes[G3W_FID],
            relation: this.relation,
            page,
            page_size,
          })
        }); // get relations
        features = response.result ? (response.vector.data.features || []).map(f => {
          f.properties[G3W_FID] = f.id;
          return {
            geometry:   f.geometry,
            attributes: f.properties,
            id:         f.id,
          };
        }) : null;
        const count = features && response.vector.count;
        if (this.nmRelation) {
          relationLayerId = this.nmRelation.referencedLayer;
          features = await this.getRelationsNM({
            nmRelation: this.nmRelation,
            features
          });
        }

        this.showChartButton = !!this.chartRelationIds.find(id => relationLayerId === id);

        this.table       = _buildRelationTable(features, relationLayerId);
        this.table.count = count;
      } catch(e) {
        console.warn(e);
      }
    },

    async showRelation(relation) {
      GUI.setLoadingContent(true);
      this.loading        = true;
      this.relation       = relation;
      try {
        await this.setRelationDataTable({
          page:       this.page,
          page_size:  this.page_size
        })

        GUI.setCurrentContentOptions({
          title: relation.name,
          crumb: { title: relation.name, text: true }/**@since 3.11.0 text attribute */
        });

        await this.$nextTick();
        this.previousview = this.currentview;
        this.currentview  = 'relation';
      } catch(e) { console.warn(e); }
      GUI.setLoadingContent(false);
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