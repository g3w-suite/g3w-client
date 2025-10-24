<!--
  @file
  @since v3.7
-->

<template>
  <div
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
          v-if              = "showrelationslist"
          v-t-tooltip:right = "'Back to relations'"
          class             = "action-button-icon action-button back-button"
          :class            = "$fa('exit')"
          @click.stop       = "back">
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
          v-if                    = "download.formats.length"
          v-disabled              = "ApplicationState.download"
          class                   = "action-button-icon action-button"
          :class                  = "[
            $fa('download'),
            { 'toggled-white': download.toggled },
          ]"
          @click.stop      = "download.handler"
          v-t-tooltip:left = "download.formats.length > 1 ? 'Downloads' : `download_types.${this.download.formats[0]}`">
        </span>

        <!-- SHOW CHART BUTTON -->
        <span
          v-if                      = "chart.button"
          class                     = "action-button-icon action-button"
          :class                    = "[
            $fa('chart'),
            chart.toggled ? 'toggled-white' : '',
          ]"
          @click.stop        = "chart.handler"
          v-t-tooltip:bottom = "'Show Chart'">
        </span>

      </div>
    </div>
    <div
      v-if       = "!norelations" 
      ref        = "wrapper"
      class      = "relation-wrapper"
      v-disabled = "!table.get_data"
    >
      <div
        id     = "table_content"
        ref    = "content"
        :style = "{
          width:       chart.toggled ? '70%' : '100%',
          marginRight: chart.toggled ? '8px' : '3px',
          position:    'relative',
        }"
      >
        <downloadformats
          v-if    = "download.toggled"
          class   = "header-component"
          :layer  = "download.layer"
          :config = "download.config"
        />

        <table
          ref       = "table"
          class     = "hover relationtable table table-striped row-border compact nowrap"
        >
          <thead>
            <tr style = "height: 0! important;">
              <th
                v-if   = "showTools"
                :style = "{
                  minWidth: showTools * 30 + 'px',
                  padding:  '0 !important',
                }"
              ></th>
              <th v-for = "c in table.columns">{{ c.label }}</th>
            </tr>
            <tr>
              <th v-if   = "showTools"></th>
              <th v-for = "(c, i) in table.columns">
                <input
                  type         = "text"
                  class        = "form-control column-search"
                  @keyup       = "changeColumn($event, i)"
                  :placeholder = "c.name"
                  :value       = "c.search"
                  :title       = "'search by ' + c.name"
                />
              </th>
            </tr>
          </thead>
          <tbody id = "table_body_attributes" hidden></tbody>
          <tbody ref = "table_body">
            
            <tr
              v-for  = "(row, index) in table.rows"
              :key   = "table.rows_fid[index]"
            >
              <td
                v-if  = "showTools"
                class = "table-tools"
              >
                <span
                  v-if              = "table.features[index].geometry"
                  @click.stop       = "zoomToGeometry(table.features[index].geometry)"
                  class             = "action-button row-form skin-color"
                  v-t-tooltip:right = "'Zoom to Geometry'"
                  :class            = "$fa('marker')"
                ></span>
                <span
                  v-if              = "table.formStructure"
                  @click.stop       = "showFormStructure(index)"
                  v-t-tooltip:right = "'Form View'"
                  class             = "action-button row-form skin-color"
                  :class            = "$fa('table')"
                ></span>
                <span
                  v-if              = "isEditable"
                  @click.stop       = "editFeature(index)"
                  class             = "action-button row-form skin-color"
                  v-t-tooltip:right = "'Edit'"
                  :class            = "$fa('pencil')"
                ></span>
              </td>
              <td v-for = "value in row.slice(1)">
                <field :state = "{value:value}"/>
              </td>
            </tr>

          </tbody>

        </table>
      </div>

      <div
        v-show          = "chart.toggled"
        class           = "skin-border-color lighten"
        style           = "border-style: solid; border-width: 0 1px 0 1px; min-width: 5px; background-color: #ddd; cursor: col-resize;"
        @mousedown.stop = "onChartResize"
      ></div>

      <div
        v-show   = "chart.toggled"
        id       = "chart_content"
        ref      = "chart"
        :style   = "{ width: chart.toggled ? '30%' : '0' }"
      ></div>

    </div>
    <div
      v-else
      class = "dataTables_scrollBody"
    >
      <span v-t = "'No relations found'"></span>
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
  import { VM }                                   from 'g3w-eventbus';
  import DataRouterService                        from 'services/data';
  import { throttle }                             from 'utils/throttle';
  import { debounce }                             from 'utils/debounce';
  import { getCatalogLayerById }                  from 'utils/getCatalogLayerById';
  import { createRelationsUrl }                   from 'utils/createRelationsUrl';
  import { getAlphanumericPropertiesFromFeature } from 'utils/getAlphanumericPropertiesFromFeature';
  import { saveBlob }                             from 'utils/saveBlob';

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

    components: {
      Field,
      'downloadformats': DownloadFormats,
    },

    data() {
      const layer  = getCatalogLayerById(this.nmRelation ? this.nmRelation.referencedLayer : this.relation.referencingLayer);
      return {

        /** @since 4.0.0 */
        ApplicationState,

        /**
         * @since 4.0.0 chart state (action button)
         */
        chart: {
          toggled: false,
          button: !!this.chartRelationIds.find(id => id === this.relation.referencingLayer),
        },

        /**
         * @since 4.0.0 download state (action button)
         */
        download: {
          formats: layer.getDownloadableFormats().filter(f => 'pdf' !== f), // filter out pdf because already includes all features
          layer:   null,
          toggled: false,
          config:  { downloads: [] }
        },

        /**
         * @since 4.0.0 whether relation layer is editable
         */
        isEditable: layer.isEditable() && !layer.isInEditing(),

        /**
         * @since 3.11.2 table state
         */
        table: {
          layerId:       layer.getId(), //@since 4.0.4
          title:         layer.getName() || layer.getTitle(),
          formStructure: layer.getLayerEditingFormStructure(),
          features:      [],
          //@TODO
          // Take in account code from 3.11 that check features attributes due settings of field visible
          /*const attrs = Object.keys(features[0] ? features[0].attributes : {});
          const cols  = layer.getTableHeaders().filter(h => attrs.includes(h.name));
          */
          columns:       layer.getTableHeaders(),
          rows:          [],
          rows_fid:      [],  
        },

        /**
         * @since 3.11.2
         */
        nmRelation: ApplicationState.project.getRelationById(this.relation.nmRelationId),

        /**
         * @since 4.0.0 whether to show table (inital request)
         */
        norelations: false,
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

      async norelations() {
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
       * @param opts
       * 
       * @returns DataTable pagination
       * 
       * @since 4.0.0
       */
      async getData(opts = {}) {
        try {
          GUI.setLoadingContent(true);
          GUI.disableContent(true);

          // get relations from server
          const response = await (await fetch(createRelationsUrl({
              layer:    this.layer,
              fid:      this.feature.attributes[G3W_FID],
              relation: this.relation,
            }), {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              page:      (opts.start ? opts.start/opts.length : 0) + 1, // get current page
              page_size: opts.length,
              formatter: 1,
              ordering:  opts.order.length ? `${'desc' === opts.order[0].dir ? '-' : ''}${this.table.columns[opts.order[0].column - Number(!!this.showTools)].name}` : undefined,
              field:     (this.table.columns || []).filter(c => ![null, undefined, ''].includes(c.search)).map(c => `${c.name}|ilike|${c.search}`).join('|AND,') || undefined,
            }),
          })).json();

          // extract features attributes
          let features = (response?.vector?.data?.features || []).map(f => ({
            id:         f.id,
            geometry:   f.geometry,
            attributes: Object.assign(f.properties, { [G3W_FID]: f.id }),
          }));

          // handle NM relations
          if (this.nmRelation && features.length) {
            features = (await DataRouterService.getData('search:features', {
              inputs: {
                layer:     getCatalogLayerById(this.nmRelation.referencedLayer),
                filter:    features.map(f => `${this.nmRelation.fieldRef.referencedField}|eq|${encodeURIComponent(f.attributes[this.nmRelation.fieldRef.referencingField])}`).join(`|OR,`),
                formatter: 1,
              },
              outputs: null
            })?.data?.[0]?.features || []).map(f => ({
              id:         f.getId(),
              geometry:   f.getGeometry(),
              attributes: getAlphanumericPropertiesFromFeature(f.getProperties()).reduce((props, p) => Object.assign(props, { [p]: f.get(p)}), {}),
            }));
          }

          this.table.features = features;
          this.table.rows     = features.map(f => [null].concat(this.table.columns.filter(h => h).map(h => { h.value = (f.attributes || f.properties)[h.name]; return h.value; })))
          this.table.rows_fid = features.map(r => r.attributes[G3W_FID]);

          return {
            data:            this.table.rows,
            recordsFiltered: response?.vector?.count ?? 0,
            recordsTotal:    response?.vector?.count ?? 0,
            filter:          features.map(f => f.id)
          };
        } catch(e) {
          console.warn(e);
          return {
            data:            [],
            recordsFiltered: 0,
            recordsTotal:    0,
          };
        } finally {
          // first request
          if (!this.table.get_data) {
            this.norelations = 0 === this.table.rows.length;
            this.table.get_data = true;
          }
          GUI.setLoadingContent(false);
          GUI.disableContent(false);
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
          - $('.query-relation  div.dataTables_scrollHeadInner').height()
          - $('.content_breadcrumb')                       .outerHeight()
          - $('.navbar')                                   .outerHeight()
          - $('.close-panel-block')                        .outerHeight()
          - $(this.$refs.header)                           .outerHeight()
          - $('.dataTables_filter').last()                 .outerHeight()
          - $('.dataTables_paginate.paging_simple_numbers').outerHeight()
          - $('.dataTables_scrollHead').last()             .outerHeight()
        );

        if (this.$table) {
          this.$table.columns.adjust();
        }
      },

      /**
       * @param type
       */
       async saveRelation(type) {
        ApplicationState.download = true;
        try {
          const response = await fetch(createRelationsUrl({
              layer:    this.layer,
              fid:      this.feature.attributes[G3W_FID],
              relation: this.relation,
              type
            }), {
            method:  'POST',
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Expose-Headers': 'Content-Disposition', // get filename from server
            },
            body: JSON.stringify({ formatter: 1 }),
            signal: AbortSignal.timeout(TIMEOUT),
          });

          if (!response?.ok) {
            throw (await response.json()).message;
          }

          saveBlob(await response.blob(), response.headers.get('content-disposition').split('filename=').at(-1));

          } catch(e) {
            console.warn(e);
            GUI.showUserMessage({
              type:     'alert',
              message:  e || 'info.server_error',
              closable: true,
            });
          }

          ApplicationState.download = false;
          this.download.toggled     = false;
      },

      /**
       * @param row
       * @param index
       */
      async showFormStructure(index) {
        GUI.showContent({
          content: new Component({
            internalComponent: new (Vue.extend({
              data: () => ({
                layerid:       this.table.layerId,
                feature:       this.table.features[index],
                fields:        this.table.columns.map(c => Object.assign(c, { value: this.table.features[index].attributes[c.name], query: true, input: { type: `${require('gui/fields/fieldsservice').getType(c)}` } })),
                formStructure: this.table.formStructure,
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
                              :tabs    = "formStructure"
                            />
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
          title:      this.table.title,
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
              id:         this.nmRelation ? this.nmRelation.referencedLayer : this.relation.referencingLayer,
              attributes: this.table.columns,
            },
            feature: this.table.features[index],
          });
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
        el.addEventListener('mouseup', async () => { 
          el.removeEventListener('mousemove', move); 
          await this.$nextTick();
          GUI.emit('resize') 
        }, { once: true });
      },

    },

    created() {
      this.resize = debounce(this.resize.bind(this));
      GUI.on('resize', this.resize);
    },

    async mounted() {
      const layer = getCatalogLayerById(this.nmRelation ? this.nmRelation.referencedLayer : this.relation.referencingLayer);

      await this.$nextTick();

      this.relation.title = this.relation.name;

      /** @FIXME add description */
      if (this.download.formats.length) {
        this.download.layer = layer.state;
        this.download.config.downloads = this.download.formats.map(format => ({
          id: format,
          format,
          cbk: () => { this.saveRelation(layer.getDownloadUrl(format)); },
          download: true,
        }));
        this.download.handler = async () => {
          if (1 == this.download.formats.length) {
            this.saveRelation(layer.getDownloadUrl(this.download.formats[0]));
          } else {
            this.download.toggled = !this.download.toggled;
          }
          this.resize();
        };
      }

      VM.$on('reload-relations', () => { this.$table?.columns?.adjust(); });

      this.chart.handler = throttle(async () => {
        this.chart.toggled = !this.chart.toggled;
        await this.$nextTick();
        this.chart.container = this.chart.container ||  $('#chart_content');
        if (this.chart.toggled) {
          GUI.getService('queryresults').showChart([this.relation.referencingLayer], this.chart.container, { relations: [this.relation], fid: this.feature.attributes[G3W_FID] });
        } else {
          GUI.getService('queryresults').hideChart(this.chart.container)
        }
        this.resize();
      });
      
      if ('ONE' !== this.relation.type) {
        this.$table = $(this.$refs.table).DataTable({
          autoWidth:      false,
          bLengthChange:  true,
          dom:            'ltip',
          bSortCellsTop:  true,
          columnDefs:     [].concat(this.showTools ? { orderable: false, targets: 0, width: '1%' } : { orderable: true, targets: 0 }),
          order:          [],
          lengthMenu:     PAGELENGTHS,
          pageLength:     layer.getAttributeTablePageLength() || PAGELENGTHS[1],
          responsive:     true,
          scrollResize:   true,
          scrollCollapse: true,
          scrollX:        true,
          serverSide:     true,
          ajax: debounce(async (opts, cb) => {
            cb(await this.getData(opts));
            await this.$nextTick();
            // initial request
            if (this.norelations) {
              this.$table.destroy(true);
              this.$table = null;
            } else {
              this.$table.columns.adjust();
            }
          }),
        });

        this.changeColumn = debounce((e, i) => {
          const value = e.target.value.trim();
          this.table.columns[i].search = value;
          this.$table.columns(i).search(value).draw();
        });
      }

      // resize after popping child relation
      GUI.on('pop-content', () => setTimeout(() => this.resize()));

      // hide datatable rows → show only our custom "table_body"
      document.getElementById('table_body_attributes').remove();

      this.resize();
    },

    /**
     * @fires hide-chart
     */
    async beforeDestroy() {
      if (this.$table) {
        this.$table.destroy();
        this.$table = null;
      }
      //In case of chart open, need to hide chart
      if (this.chart.toggled) {
         GUI.getService('queryresults').hideChart(this.chart.container);
      }
      if (this.chart.container) {
        this.$emit('hide-chart', this.chart.container);
        this.chart.container = null;
      }
      //reset columns search attribute to reset search
      this.table.columns.forEach(c => delete c.search); 
      GUI.off('pop-content', this.resize);
      GUI.off('resize', this.resize);
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
  .form-control.column-search {
    font-style: italic;
    font-weight: normal;
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