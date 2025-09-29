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
        <b class = "relation-tile"> {{ relation.name }} </b>

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
      v-disabled = "!table.get_data"
      class      = "relation-wrapper"
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

        <!-- PAGE SIZE -->
        <label style="margin-top: 5px;">{{ $t('show') }} <select style = "border: 1px solid #aaa;" v-model = "table.page_size">
          <option v-for = "l in PAGELENGTHS" :value = "l">{{ l }}</option>
        </select> {{ $t('values per page') }}</label>

        <table ref = "table">
          <thead>
            <tr style = "height: 0! important;">
              <th
                v-if   = "showTools"
                :style = "{
                  minWidth: showTools * 30 + 'px',
                  padding:  '0 !important',
                }"
              ></th>
              <th
                v-for          = "(c, i) in table.columns"
                @click.stop    = "sortColumn(i)"
                :class         = "[i === table.ordering[0] ? table.ordering[1] : '' ]"
                :title         = "$t('sort by:') + ' ' + c.label"
                data-placement = "top"
                :style         = "{'width': `${100 / table.columns.length }%`}"
              >{{ c.label }}</th>
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
          <tbody>
            
            <tr
              v-for = "(row, index) in table.rows"
              :key  = "table.rows_fid[index]"
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
                  @click.stop       = "showForm(row, index)"
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

        <!-- TABLE TOOLBAR -->
        <div class="table-toolbar" style="display: flex; gap: 1ch; margin-top: 1ch;">
          <!-- TOTAL ELEMENTS -->
          <span>{{ table.rows.length }} {{ $t('entries') }}</span>

          <!-- PAGINATION BUTTONS -->
          <div style = "margin-left: auto;" >
            <button @click.stop = "table.page = Number(table.page) - 1" class="btn" v-disabled = "1 == table.page">«</button>
            <select
              v-model         = "table.page"
              style           = "padding: 5px 12px; appearance: none; border: 0; text-align: center; border-radius: 3px; cursor: pointer;"
              v-t-tooltip:top = "table.page + $t(' of ') + pages"
              data-placement  = "top"
            >
              <option v-for = "p in pages" :selected = "p == table.page">{{ p }}</option>
            </select>
            <button @click.stop = "table.page = Number(table.page) + 1" class="btn" v-disabled = "pages == table.page">»</button>
          </div>
        </div>
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
    <div v-else><span v-t = "'No relations found'"></span></div>
  </div>

</template>

<script>

  import { G3W_FID, PAGELENGTHS, TIMEOUT } from 'g3w-constants';
  import ApplicationState                  from 'g3w-state';
  import Component                         from 'g3w-component';
  import Field                             from 'components/FieldG3W.vue';
  import DownloadFormats                   from 'components/QueryResultsActionDownloadFormats.vue';
  import { FieldsService }                 from 'components/g3w-fields';
  import GUI                               from 'g3w-app';
  import { throttle }                      from 'utils/throttle';
  import { debounce }                      from 'utils/debounce';
  import { getCatalogLayerById }           from 'utils/getCatalogLayerById';
  import { createRelationsUrl }            from 'utils/createRelationsUrl';
  import { getAlphanumericProps }          from 'utils/getAlphanumericProps';
  import { saveBlob }                      from 'utils/saveBlob';

  export default {

    /** @since 3.8.6 */
    name: 'relation',

    props: {
      feature:           { default: null },
      relation:          {},
      previousview:      {},
      cardinality:       {},
      layerId:           0,
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

        /**
         * @since 4.0.0
         */
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
          formats: layer.getDownloadFormats().filter(f => 'pdf' !== f), // exclude pdf because already includes all features
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
          title:         layer.getName() || layer.getTitle(),
          formStructure: layer.getLayerEditingFormStructure(),
          features:      [],
          page:          1,
          page_size:     layer.getAttributeTablePageLength() || PAGELENGTHS[1],
          columns:       layer.getTableHeaders(),
          rows:          [],
          rows_fid:      [],
          ordering:      [-1, 'asc']
        },

        /**
         * @since 3.11.2
         */
        nmRelation: ApplicationState.project.getRelationById(this.relation.nmRelationId),

        /**
         * @since 4.0.0 whether to show table (inital request)
         */
        norelations: false,

        /**
         * @since 4.1.0
         */
        PAGELENGTHS,
      };
    },

    computed: {

      /**
       * @returns { number } count of available tools (editing icon, form structure, zoom to feature, ...)
       *
       * @since 3.9.0
       */
      showTools() {
        return [!!this.isEditable, !!this.table.formStructure, !!this.table.features?.some(f => f.geometry)].filter(Boolean).length;
      },

      /**
       * @since 4.1.0
       */
      pages() {
        return Math.ceil(this.table.rows.length / this.table.page_size);
      },

    },

    watch: {
      async 'table.page_size'() {
        this.getData();
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
          const geom = new ol.geom[geometry.type](geometry.coordinates);
          GUI.zoomToExtent(geom?.getExtent(), { highlight: true, highLightGeometry: geom });
        }
      },

      /**
       * @param { number } index column index
       */
      sortColumn(index) {
        if (index === this.table.ordering[0]) {
          this.table.ordering[1] = 'asc' === this.table.ordering[1] ? 'desc' : 'asc';
        } else {
          this.table.ordering[0] = index;
          this.table.ordering[1] = 'asc';
        }
        this.getData({ ordering: index });
      },

      /**
       * Fetch data from server
       * 
       * @param opts
       * @param { number } opts.ordering
       * @param { number } opts.page current page
       * 
       * @since 4.0.0
       */
      async getData({
        ordering  = 0,
        page      = 1,
      } = {}) {
        GUI.setLoadingContent(true);
        GUI.disableContent(true);

        try {
          // get relations from server
          const response = await (await fetch(createRelationsUrl({
              layerId:  this.layerId,
              fid:      this.feature.attributes[G3W_FID],
              relation: this.relation,
            }), {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              page,
              page_size: this.table.page_size,
              formatter: 1,
              ordering: ordering ? ('asc' === this.table.ordering[1] ? '' : '-') + this.table.columns[ordering].name : undefined,
              field:     this.table.columns?.filter(c => c.search).map(c => `${c.name}|ilike|${c.search}`).join('|AND,') || undefined,
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
            features = (await GUI.getData('search:features', {
              inputs: {
                layer:     getCatalogLayerById(this.nmRelation.referencedLayer),
                filter:    features.map(f => `${this.nmRelation.fieldRef.referencedField}|eq|${encodeURIComponent(f.attributes[this.nmRelation.fieldRef.referencingField])}`).join(`|OR,`),
                formatter: 1,
              },
              outputs: null
            })?.data?.[0]?.features || []).map(f => ({
              id:         f.getId(),
              geometry:   f.getGeometry(),
              attributes: getAlphanumericProps(f.getProperties()).reduce((props, p) => Object.assign(props, { [p]: f.get(p)}), {}),
            }));
          }

          this.table.features = features;
          this.table.rows     = features.map(f => [null].concat(this.table.columns.filter(h => h).map(h => { h.value = (f.attributes || f.properties)[h.name]; return h.value; })))
          this.table.rows_fid = features.map(r => r.attributes[G3W_FID]);
          this.table.page     = page;

        } catch(e) {
          console.warn(e);
        }

        // first request
        if (!this.table.get_data) {
          this.norelations = 0 === this.table.rows.length;
          this.table.get_data = true;
        }

        GUI.setLoadingContent(false);
        GUI.disableContent(false);
      },

      /**
       * @param type
       */
       async saveRelation(type) {
        ApplicationState.download = true;
        try {
          const response = await fetch(createRelationsUrl({
              layerId:  this.layerId,
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
      async showForm(row, index) {
        GUI.showContent({
          content: new Component({
            internalComponent: new (Vue.extend({
              data: () => ({
                layerid:       this.table.layerId,
                feature:       this.table.features[index],
                fields:        this.table.columns.map((c, i) => Object.assign(c, { value: row[i], query: true, input: { type: `${FieldsService.getType(c)}` } })),
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
        GUI.editFeature({
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
        };
      }

      this.chart.handler = throttle(async () => {
        this.chart.toggled = !this.chart.toggled;
        await this.$nextTick();
        this.chart.container = this.chart.container ||  $('#chart_content');
        if (this.chart.toggled) {
          GUI.showChart([this.relation.referencingLayer], this.chart.container, { relations: [this.relation], fid: this.feature.attributes[G3W_FID] });
        } else {
          GUI.hideChart(this.chart.container)
        }
      });
      
      if ('ONE' !== this.relation.type) {
        this.getData().then(() => {
          if (this.norelations) {
            // this.$refs.table.hidden = true;
          }
        });

        this.changeColumn = debounce((e, i) => {
          this.table.columns[i].search = e.target.value.trim();
          this.getData();
        });
      }

    },

    /**
     * @fires hide-chart
     */
    async beforeDestroy() {
      // hide opened chart
      if (this.chart.toggled) {
         GUI.hideChart(this.chart.container);
      }
      if (this.chart.container) {
        this.$emit('hide-chart', this.chart.container);
        this.chart.container = null;
      }
      // reset columns search
      this.table.columns.forEach(c => delete c.search); 
    },

  };
</script>

<style scoped>
  .query-relation {
    margin-top: 3px;
  }

  .query-relation > .header {
    margin-top: 5px;
    margin-bottom: 5px;
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

  .table-tools .action-button:hover {
    background-color: transparent;
  }

  #chart_content {
    padding-bottom: 5px;
    margin-bottom: 5px;
    margin-left: 8px;
  }

  input.form-control.column-search::placeholder {
    font-weight: normal;
    font-style: italic;
  }

  input.form-control.column-search {
    height: 25px;
    min-width: 40px;
    padding: 2px;
  }

  table {
    width: 100%;
    user-select: none;
    display: block;
    height: calc(100% - 60px);
    overflow: auto;
    border-collapse: separate
  }

  thead {
    position: sticky;
    top: 0;
    background-color: #fff;
  }

  tbody > tr.selected {
    box-shadow: inset 0 0 0 9999px rgb(13, 110, 253, .9);
    color: #fff;
  }

  tbody > tr:not(.selected):hover {
    background-color: rgb(255, 255, 0, 0.15);
  }

  th, td {
    white-space: nowrap;
  }

  th {
    cursor: pointer;
  }

  td {
    border-top: 1px solid rgba(0,0,0,.15);
  }

  th.asc, th.desc { 
    border-top: var(--skin-color) medium solid;
  }

  th.asc::after {
    content: "▴";
  }

  th.desc::after {
    content: "▾";
  }

  .relation-wrapper {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    margin-top: 3px;
    height: 95%;
  }
</style>