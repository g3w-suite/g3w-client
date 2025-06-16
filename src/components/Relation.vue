<!--
  @file
  @since v3.7
-->

<template>
  <div
    v-if   = "table"
    class  = "query-relation"
    ref    = "relation"
    :class = "isMobile() ? 'mobile' : null"
  >

    <div
      class = "header skin-background-color lighten"
      ref   = "header"
    >

      <div class = "g3w-long-text">

      <!-- BACK BUTTON -->
        <span
          v-if                     = "showrelationslist"
          v-t-tooltip:right.create = "'sdk.relations.back_to_relations'"
          class                    = "action-button-icon action-button back-button"
          :class                   = "$fa('exit')"
          @click.stop              = "back">
        </span>

        <!-- RELATION NAME -->
        <b class = "relation-tile skin-color"> {{ relation.name }} </b>

      </div>

      <div
        v-if  = "table.rows.length"
        class = "relations-table-tools"
      >

        <!-- DOWNLOAD BUTTON -->
        <span
          v-if                    = "downloadButton"
          v-download
          class                   = "action-button-icon action-button"
          :class                  = "[
            $fa('download'),
            { 'toggled-white': downloadButton.toggled },
          ]"
          @click.stop             = "downloadButton.handler"
          v-t-tooltip:left.create = "downloadButton.tooltip">
        </span>

        <!-- SHOW CHART BUTTON -->
        <span
          v-if                      = "showChartButton"
          class                     = "action-button-icon action-button"
          :class                    = "[
            $fa('chart'),
            chart ? 'toggled-white' : '',
          ]"
          @click.stop               = "showChart"
          v-t-tooltip:bottom.create = "'sdk.tooltips.show_chart'">
        </span>

      </div>
    </div>

    <div
      v-if  = "table.rows.length"
      ref   = "wrapper"
      class = "relation-wrapper"
    >

      <div
        id     = "table_content"
        ref    = "content"
        :style = "{
          width:       chart ? '70%' : '100%',
          marginRight: chart ? '8px' : '3px',
          position:    'relative',
        }"
      >
        <div
          v-if  = "headercomponent"
          class = "header-component"
        >
          <component
            :is     = "headercomponent"
            :layer  = "downloadLayer.state"
            :config = "downloadLayer.config"
          />
        </div>
        <table
          ref   = "table"
          class = "hover relationtable table table-striped row-border compact nowrap"
        >
          <thead>
            <tr style = "height: 0! important;">
              <th
                v-if   = "showTools"
                :style = "{
                  minWidth: this.showTools * 30 + 'px',
                  padding:  '0 !important',
                }"
              ></th>
              <th v-for = "column in table.columns">{{ column }}</th>
            </tr>
          </thead>

          <tbody>
          <tr
            v-for  = "(row, index) in table.rows"
            :key   = "table.rows_fid[index]"
            :class = "{
              'selected': table.rowFormStructure === row,
            }"
          >
            <td
              v-if  = "showTools"
              class = "table-tools"
            >
              <span
                v-if                     = "table.features[index].geometry"
                @click.stop              = "zoomToGeometry(table.features[index].geometry)"
                class                    = "action-button row-form skin-color"
                v-t-tooltip:right.create = "'sdk.tooltips.relations.zoomtogeometry'"
                :class                   = "$fa('marker')"
              ></span>
              <span
                v-if                     = "table.formStructure"
                @click.stop              = "showFormStructureRow({
                  title:   table.title,
                  layerid: table.layerId,
                  feature: table.features[index],
                  fields:  table.fields.map((field, i) => Object.assign(field, { value: row[i], query: true, input: { type: `${getFieldType(field)}` } })),
                  tabs:    table.formStructure
                  })"
                v-t-tooltip:right.create = "`sdk.tooltips.relations.row_to_form`"
                class                    = "action-button row-form skin-color"
                :class                   = "$fa('table')"
              ></span>
              <span
                v-if                     = "isEditable"
                @click.stop              = "editFeature(index)"
                class                    = "action-button row-form skin-color"
                v-t-tooltip:right.create = "'Edit'"
                :class                   = "$fa('pencil')"
              ></span>
            </td>
            <td v-for = "value in row">
              <field :state = "{value:value}"/>
            </td>
          </tr>

          </tbody>

        </table>

      </div>

      <div
        v-show          = "chart"
        class           = "skin-border-color lighten"
        style           = "border-style: solid; border-width: 0 1px 0 1px; min-width: 5px; background-color: #ddd; cursor: col-resize;"
        @mousedown.stop = "onChartResize"
      ></div>

      <div
        v-show   = "chart"
        id       = "chart_content"
        ref      = "chart"
        :style   = "{ width: chart ? '30%' : '0' }"
      ></div>

    </div>

    <div
      v-else
      class = "dataTables_scrollBody"
    >
      <span v-t = "'sdk.relations.no_relations_found'"></span>
    </div>

  </div>

</template>

<script>

  import { G3W_FID, PAGELENGTHS, TIMEOUT }        from 'g3w-constants';
  import ApplicationState                         from 'store/application';
  import Component                                from 'g3w-component';
  import Field                                    from 'components/FieldG3W.vue';
  import DownloadFormats                          from 'components/QueryResultsActionDownloadFormats.vue';
  import GUI                                      from 'services/gui';
  import { fieldsMixin, resizeMixin }             from 'mixins';
  import { VM }                                   from 'g3w-eventbus';
  import DataRouterService                        from 'services/data';
  import { throttle }                             from 'utils/throttle';
  import { getCatalogLayerById }                  from 'utils/getCatalogLayerById';
  import { XHR }                                  from 'utils/XHR';
  import { createRelationsUrl }                   from 'utils/createRelationsUrl';
  import { getAlphanumericPropertiesFromFeature } from 'utils/getAlphanumericPropertiesFromFeature';
  import { saveBlob }                             from 'utils/saveBlob';

  let SIDEBARWIDTH;

  export default {

    /** @since 3.8.6 */
    name: 'relation',

    props: {
      feature:           { default: null },
      relation:          {},
      previousview:      {},
      cardinality:       {},
      layer:             {},
      showrelationslist: { default: false},
      chartRelationIds:  { default: [] }
    },

    mixins: [fieldsMixin, resizeMixin],

    components: {
      Field,
    },

    data() {
      return {
        fields:          null,
        chart:           false,
        headercomponent: null,
        downloadButton:  null,
        downloadLayer:  {
          state:  null,
          config: { downloads: [] },
        },

        /**
         * @since 3.11.2
         */
        table: {
          rows: [],
        },

        /**
         * @since 3.11.2
         */
        nmRelation: ApplicationState.project.getRelationById(this.relation.nmRelationId),

        /**
         * @since 3.11.2
         */
        showChartButton: !!this.chartRelationIds.find(id => id === this.relation.referencingLayer),
      };
    },

    computed: {

      /**
       * @returns { number } count of available tools (editing icon, form structure, zoom to feature, ...)
       *
       * @since 3.9.0
       */
      showTools() {
        const isGeoLayer = (this.table.features || []).some(f => f.geometry);
        return [!!this.isEditable, !!this.table.formStructure, !!isGeoLayer].filter(Boolean).length;
      },

    },

    watch: {

      async chart(){
        await this.$nextTick();
        this.resize();
      },

      async headercomponent() {
        await this.$nextTick();
        this.resize();
      },

    },

    methods: {

     /**
      * @param { Object } geometry
      * @param geometry.type        Point, MultiPoint, etc ...
      * @param geometry.coordinates
      *
      * @since 3.9.0
      */
      zoomToGeometry(geometry) {
        if (geometry) {
          GUI
            .getService('map')
            .zoomToGeometry(new ol.geom[geometry.type](geometry.coordinates), { highlight: true });
        }
      },

      /**
       * @param opts     - settings used for render new table
       * @param prevOpts - settings used for render old table
       *  
       * @returns { Promise<void> }
       */
      async createTable(opts, prevOpts = {}) {

        try {

          GUI.setLoadingContent(true);

          // Destroy previous table
          if (this.$table) {
            this.$table.destroy(true);
            this.$table     = null;
            this.table.rows = [];
            await this.$nextTick();
          }

          try {

            const changed = (opts.page_size !== prevOpts.page_size || opts.start !== prevOpts.start);

            // merge options: (defaults + old + new) 
            opts = {
              /** @type { "desc" | "asc" | "current" } column order */
              sort: 'asc',
              /** @type { string | undefined } parameter sent to server ("-" = descending ) only if user has already clicked on a column to sort data */
              ordering: undefined,
              start: 0,
              sort_column: 0,
              order: [],
              ...prevOpts,
              ...opts
            };


            // check if ordering is asked by user by click on a column
            if (opts.ordering && changed) {
              opts.sort = opts.order[0].dir; // in case of change page, get last sorting of column
            }

            // in case of sort columns is not a previous column
            if (opts.ordering && !changed && opts.order[0].column !== opts.sort_column) {
              opts.sort = 'asc';
            }

            // invert sort
            if (opts.ordering && !changed && opts.order[0].column === opts.sort_column) {
              opts.sort = ('desc' === opts.sort ? 'asc' : 'desc');
            }

            // in case of set ordering (field sort) or not set ordering (start time)
            if (opts.ordering || opts.order.length) {
              opts.ordering = `${'desc' === opts.sort ? '-' : ''}${this.table.fields[opts.order[0].column - Number(!!this.showTools)].name}`;
            }

            /** @type { number } current column index */
            opts.sort_column = opts.ordering && (this.table.fields.findIndex(({ name }) => ('desc' === opts.sort ? opts.ordering.slice(1) : opts.ordering) === name) + Number(!!this.showTools) ); //need to add 1 if threa are some 
            
            // Get relations from server
            const response = await XHR.get({
              url: createRelationsUrl({
                layer:     this.layer,
                fid:       this.feature.attributes[G3W_FID],
                relation:  this.relation,
                page:      opts.page,
                page_size: opts.page_size,
                ordering:  opts.ordering,
              })
            }); 

            //extract features attributes, Array, and digest for table
            let features = (response.result && response.vector && response.vector.data) ? (response.vector.data.features || []).map(f => {
              f.properties[G3W_FID] = f.id;
              return {
                geometry:   f.geometry,
                attributes: f.properties,
                id:         f.id,
              };
            }) : [];

            // handle NM relations
            const NM = this.nmRelation && (features || []).length && await DataRouterService.getData('search:features', {
              inputs: {
                layer:     getCatalogLayerById(this.nmRelation.referencedLayer),
                filter:    features.map(f => `${this.nmRelation.fieldRef.referencedField}|eq|${encodeURIComponent(f.attributes[this.nmRelation.fieldRef.referencingField])}`).join(`|OR,`),
                formatter: 1, // set formatter to
              },
              outputs: null
            });

            if (NM && NM.data && NM.data[0] && Array.isArray(NM.data[0].features)) {
              features = NM.data[0].features.map(f => ({
                id:         f.getId(),
                geometry:   f.getGeometry(),
                attributes: getAlphanumericPropertiesFromFeature(f.getProperties()).reduce((props, p) => Object.assign(props, { [p]: f.get(p)}), {}),
              }));
            }

            // build relation table
            const layer = ApplicationState.project.getLayerById(this.nmRelation ? this.nmRelation.referencedLayer : this.relation.referencingLayer);
            const attrs = Object.keys(features[0] ? features[0].attributes : {});
            const cols  = layer.getTableHeaders().filter(h => attrs.includes(h.name));

            this.table = {
              count:            response.result && response.vector.count,
              features,
              columns:          cols.map(c => c.label),
              rows:             features.map(r => cols.map(c => r.attributes[c.name])),
              rows_fid:         features.map(r => r.attributes[G3W_FID]),
              fields:           cols.length ? cols : null,
              formStructure:    layer.getLayerEditingFormStructure(),
              rowFormStructure: null,
              layerId:          layer.getId(),
              title:            layer.getName() || layer.getTitle(), //@since 3.11.0
            };
          } catch(e) {
            this.table = { rows: [] };
            console.warn(e);
          }

          if (0 === this.table.rows.length) {
            return;
          }

          const layer     = getCatalogLayerById(this.table.layerId);

          this.isEditable = layer.isEditable() && !layer.isInEditing();

          //@since 3.11.0 Need to filter pdf because it can be possible download only single feature pdf, not all layer features
          const downloadformats = layer.getDownloadableFormats().filter(f => 'pdf' !== f);

          /** @FIXME add description */
          if (downloadformats.length > 0) {
            this.downloadButton = {
              toggled: false,
              tooltip: downloadformats.length > 1 ? 'Downloads' : `sdk.tooltips.download_${downloadformats[0]}`,
              handler: downloadformats.length > 1
                ? async () => {
                    this.downloadButton.toggled         = !this.downloadButton.toggled;
                    this.downloadLayer.state            = this.downloadLayer.state || layer.state;
                    this.downloadLayer.config.downloads = this.downloadLayer.config.downloads.length
                      ? this.downloadLayer.config.downloads
                      : downloadformats.map(format => ({
                          id: format,
                          format,
                          cbk: () => {
                            this.saveRelation(layer.getDownloadUrl(format));
                            this.headercomponent = null;
                          },
                          download: true,
                        })
                    );
                    this.headercomponent = this.downloadButton.toggled ? DownloadFormats : null;
                  }
                : () => this.saveRelation(layer.getDownloadUrl(downloadformats[0]))
            }
          }

          VM.$on('reload-relations', () => { this.reloadLayout(); });

          this.showChart = throttle(async () => {
            this.chart = !this.chart;
            await this.$nextTick();
            this.chartContainer = this.chartContainer ||  $('#chart_content');
            this.chart 
              ? GUI.getService('queryresults').showChart([this.relation.referencingLayer], this.chartContainer, { relations: [this.relation], fid: this.feature.attributes[G3W_FID] })
              : GUI.getService('queryresults').hideChart(this.chartContainer)
          });

          await this.$nextTick();

          SIDEBARWIDTH = GUI.getSize({ element:'sidebar', what:'width' });

          this.relation.title = this.relation.name;

          if ('ONE' !== this.relation.type) {
            //check if you need to get data pagination from server or use all features
            const data_from_server = this.table.rows.length < this.table.count;
            this.$table = $(this.$refs.table).DataTable({
              autoWidth:      false,
              bLengthChange:  true,
              dom:            'ltip',
              columnDefs:     [].concat(this.showTools ? { orderable: false, targets: 0, width: '1%' } : { orderable: true, targets: 0 }),
              order:          [].concat(opts.ordering ? [ opts.sort_column, opts.sort] : []),
              lengthMenu:     PAGELENGTHS,
              pageLength:     opts.page_size,
              displayStart:   opts.start,
              responsive:     true,
              scrollResize:   true,
              scrollCollapse: true,
              scrollX:        true,
              deferLoading:   data_from_server && this.table.count,
              serverSide:     data_from_server,
              ajax: data_from_server ? newOpts => {
                this.createTable({
                  ...newOpts,
                  page:       1 + (0 !== newOpts.start ? newOpts.start/newOpts.length : 0),
                  page_size: newOpts.length,
                }, opts);
              } : null,
            });
            this.tableHeaderHeight = $('.query-relation  div.dataTables_scrollHeadInner').height();
          }

          // resize after popping child relation
          GUI.on('pop-content', () => setTimeout(() => this.resize()));

          this.resize();
        } catch(e) {
          console.warn(e);
        } finally {
          GUI.setLoadingContent(false);
        }
      },

      /**
       * @returns { Promise<void> }
       */
      async resize() {
        // skip when ..
        if (!this.$refs.relation || 'none' === this.$refs.relation.parentNode.style.display) {
          return;
        }

        // in case of waiting table
        const table      = $(this.$refs.relation).find('div.dataTables_scrollBody');
        table.height(
          $(".content").height()
          - this.tableHeaderHeight
          - $('.content_breadcrumb')                       .outerHeight()
          - $('.navbar')                                   .outerHeight()
          - $('.close-panel-block')                        .outerHeight()
          - $(this.$refs.header)                           .outerHeight()
          - $('.dataTables_filter').last()                 .outerHeight()
          - $('.dataTables_paginate.paging_simple_numbers').outerHeight()
          - $('.dataTables_scrollHead').last()             .outerHeight()
        );

        this.reloadLayout();
      },

      /**
       * @param type
       */
       async saveRelation(type) {
        ApplicationState.download = true;
        try {
          const response = await fetch(createRelationsUrl(Object.assign({
              layer:    this.layer,
              fid:      this.feature.attributes[G3W_FID],
              relation: this.relation,
            }, { type })), {
              headers: { 'Access-Control-Expose-Headers': 'Content-Disposition' }, // get filename from server
              signal:  AbortSignal.timeout(TIMEOUT),
          });

          if (!(response && response.ok)) {
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
          this.downloadButton.toggled = false;
      },

      /**
       * @param event
       * @param row
       *
       * @returns { Promise<void> }
       */
      async showFormStructureRow({ title, layerid, feature, fields, tabs } = {}) {
        GUI.showContent({
          content: new Component({
            internalComponent: new (Vue.extend({
              data: () => ({
                layerid,
                feature,
                fields,
                formStructure: tabs,
              }),
              template: /* html */`
                <div class="queryresults-wrapper">
                  <div class ="queryresults-container">
                    <table ref="table" class="table">
                      <tbody>
                      <tr class="featurebox-body">
                        <td>
                          <tabs
                            :layerid = "layerid"
                            :feature = "feature"
                            :fields  = "fields"
                            :tabs    = "formStructure" />
                        </td>
                      </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              `,
              async mounted() {
                await this.$nextTick();
                this.$refs.table.click();
              }
            }))
          }),
          push:       true,
          showgoback: true,
          closable:   false,
          title, //@since 3.11.0
        });
      },

      /**
       * @param index
       */
      editFeature(index) {
        GUI
          .getService('queryresults')
          .editFeature({
            layer: {
              id:         this.table.layerId,
              attributes: this.table.fields,
            },
            feature: this.table.features[index],
          });
      },

      /**
       * @FIXME add description
       */
      reloadLayout() {
        if (this.$table) {
          this.$table.columns.adjust();
        }
      },

      /**
       * @FIXME add description
       */
      back() {
        this.$parent.setRelationsList();
      },

      onChartResize() {
        const move = e => {
          const perc                     =  (Math.abs(e.x -  window.innerWidth) * 100 / $(this.$refs.wrapper).width()); // percentage
          this.$refs.content.style.width = `${100 - perc}%`;
          this.$refs.chart.style.width   = `${perc}%`;
        };
        const el = document.getElementById('g3w-view-content');
        el.addEventListener('mousemove', move);
        el.addEventListener('mouseup', () => { el.removeEventListener('mousemove', move); this.$nextTick().then(() => GUI.emit('resize')) }, { once: true });
      },

    },

    beforeCreate() {
      this.delayType = 'debounce';
    },

    async created() {
      await this.createTable({
        page:      1,
        page_size: PAGELENGTHS[0],
      });
    },

    /**
     * @fires hide-chart
     */
    async beforeDestroy() {
      if (this.$table) {
        this.$table.destroy();
        this.$table = null;
      }
      if (this.chartContainer) {
        this.$emit('hide-chart', this.chartContainer);
        this.chartContainer    = null;
      }
      this.tableHeaderHeight = null;
      GUI.off('pop-content', this.resize);
    },

  };
</script>

<style scoped>
  .query-relation {
    margin-top: 3px;
  }
  .query-relation > .header {
    padding: 3px;
    display: flex;
    justify-content:
    space-between;
    align-items: center;
    width: 100%;
    margin: 0 !important;
  }
  .query-relation > .header > .g3w-long-text {
    border-radius: 3px;
    font-size: 1.3em;
  }
  .query-relation.mobile > .header > .g3w-long-text {
    font-size: 1em;
  }
  .relations-table-tools {
    font-size: 1.1em;
    margin-bottom: 3px
  }
  .relations-table-tools > .action-button {
    padding: 5px;
  }
  .relation-wrapper {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    margin-top: 3px;
    height: 95%;
  }
  .back-button {
    font-size: 0.8em;
  }
  .header-component {
    width: 100%;
    display: flex;
    margin-left: auto;
    margin-bottom: 5px;
    margin-right: 4px;
  }
  .relationtable .table-tools .action-button:hover {
    background-color: transparent;
  }
  .relationtable.dataTable tbody tr.selected {
    background-color: #e4e4e4 !important;
  }
  .relationtable.dataTable tbody tr.selected .row-wrap-tabs .tabs-wrapper {
    background-color: #FFF !important;
  }
  #chart_content {
    padding-bottom: 5px;
    margin-bottom: 5px;
    margin-left: 8px;
  }
  .dataTables_scrollBody {
    font-weight: bold;
    margin-top: 10px;
    font-size: 1.1em;
    display: flex;
    justify-content: space-between;
  }
</style>

<style>
.relation-wrapper .dataTables_length select {
  border: 1px solid #ccc;
  background: #fff;
  height: 27px;
}
.relation-wrapper .paginate_button {
  background: transparent !important;
  color: currentColor !important;
  box-shadow: none !important;
}
.relation-wrapper .paginate_button.disabled {
  opacity: 0.25 !important;
}
.relation-wrapper .dataTables_scroll {
  background: #fff;
}
</style>
