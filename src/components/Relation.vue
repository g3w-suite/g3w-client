<!--
  @file
  @since v3.7
-->

<template>
  <div
    v-if   = "table"
    class  = "query-relation"
    ref    = "query_relation"
    :class = "isMobile() ? 'mobile' : null"
  >

    <div
      class = "header skin-background-color lighten"
      ref   = "relation-header"
    >

      <div class="g3w-long-text">

      <!-- BACK BUTTON -->
        <span
          v-if                     = "showrelationslist"
          v-t-tooltip:right.create = "'sdk.relations.back_to_relations'"
          class                    = "action-button-icon action-button back-button"
          :class                   = "g3wtemplate.getFontClass('exit')"
          @click.stop              = "back"
        ></span>

        <!-- RELATION NAME -->
        <b class="relation-tile skin-color"> {{ relation.name }} </b>

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
            g3wtemplate.getFontClass('download'),
            { 'toggled-white': downloadButton.toggled },
          ]"
          @click.stop             = "downloadButton.handler"
          v-t-tooltip:left.create = "downloadButton.tooltip"
        ></span>

        <!-- SHOW CHART BUTTON -->
        <span
          v-if                      = "showChartButton"
          class                     = "action-button-icon action-button"
          :class                    = "[
            g3wtemplate.getFontClass('chart'),
            chart ? 'toggled-white' : '',
          ]"
          @click.stop               = "showChart"
          v-t-tooltip:bottom.create = "'sdk.tooltips.show_chart'"
        ></span>

      </div>
    </div>

    <div
      v-if  = "table.rows.length"
      ref   = "relationwrapper"
      class = "relation-wrapper"
    >

      <div
        id     = "table_content"
        ref    = "tablecontent"
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
          ref   = "relationtable"
          class = "hover relationtable table table-striped row-border"
        >
          <thead>
            <tr style="height: 0! important;">
              <th
                v-if   = "showTools"
                :style = "{
                  minWidth: this.showTools * 30 + 'px',
                  padding:  '0 !important',
                }"
              ></th>
              <th v-for="column in table.columns">{{ column }}</th>
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
                :class                   = "g3wtemplate.getFontClass('marker')"
              ></span>
              <span
                v-if                     = "table.formStructure"
                @click.stop              = "showFormStructureRow($event, row)"
                :current-tooltip         = "`sdk.tooltips.relations.${table.rowFormStructure === row ? 'form_to_row' : 'row_to_form'}`"
                class                    = "action-button row-form skin-color"
                v-t-tooltip:right.create = "`sdk.tooltips.relations.${table.rowFormStructure === row ? 'form_to_row' : 'row_to_form'}`"
                :class                   = "g3wtemplate.getFontClass(table.rowFormStructure === row ? 'minus' : 'table')"
              ></span>
              <span
                v-if                     = "isEditable"
                @click.stop              = "editFeature(index)"
                class                    = "action-button row-form skin-color"
                v-t-tooltip:right.create = "'Edit'"
                :class                   = "g3wtemplate.getFontClass('pencil')"
              ></span>
            </td>

            <td
              v-if     = "table.formStructure && table.rowFormStructure === row"
              :colspan = "table.columns.length"
              class    = "row-wrap-tabs"
            >
              <tabs
                :layerid = "table.layerId"
                :feature = "table.features[index]"
                :fields  = "fields"
                :tabs    = "table.formStructure"
              />
            </td>
            <template v-else>
              <td v-for="value in row">
                <field :state="{value:value}"/>
              </td>
            </template>

          </tr>

          </tbody>

        </table>

      </div>

      <g3w-resize
        :show    = "chart"
        :moveFnc = "moveFnc"
        :where   = "'content'"
        class    = "skin-border-color lighten"
        style    = "border-style: solid; border-width: 0 1px 0 1px"
      />

      <div
        v-show   = "chart"
        id       = "chart_content"
        ref      = "chartcontent"
        :style   = "{ width: chart ? '30%' : '0' }"
      ></div>

    </div>

    <div
      v-else
      class = "dataTables_scrollBody"
    >
      <span v-t="'sdk.relations.no_relations_found'"></span>
    </div>

  </div>

</template>

<script>
import { G3W_FID }                  from 'app/constant';
import Field                        from 'components/FieldG3W.vue';
import DownloadFormats              from 'components/QueryResultsActionDownloadFormats.vue';
import CatalogLayersStoresRegistry  from 'store/catalog-layers';
import GUI                          from 'services/gui';
import { fieldsMixin, resizeMixin } from 'mixins';
import { RelationEventBus as VM }   from 'app/eventbus';
import { throttle }                 from 'utils';

let SIDEBARWIDTH;

export default {

  /** @since 3.8.6 */
  name: 'relation',

  props: {
    table:           {},
    feature:         { default: null },
    relation:        {},
    previousview:    {},
    showChartButton: {},
    cardinality:     {},
  },

  inject: ['relationnoback'],

  mixins: [fieldsMixin, resizeMixin],

  components: {
    Field,
  },

  data() {
    return {
      fields: null,
      chart: false,
      headercomponent: null,
      downloadButton: null,
      downloadLayer: {
        state: null,
        config: {
          downloads: [],
        },
      },
    };
  },

  computed: {

    /**
     * @returns { number } count of available tools (editing icon, form structure, zoom to feature, ...)
     * 
     * @since 3.9.0
     */
    showTools() {
      return [!!this.isEditable, !!this.table.formStructure, !!this.isGeoLayer].filter(Boolean).length;
    },

    showrelationslist() {
      return 'relations' === this.previousview  && !this.relationnoback;
    },

    one() {
      return 'ONE' === this.relation.type;
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
     * @returns { Promise<void> }
     */
    async createTable() {
      const layer     = CatalogLayersStoresRegistry.getLayerById(this.table.layerId);

      this.isEditable = layer.isEditable() && !layer.isInEditing();

      // check if feature has geometry.
      // layer.isGeolayer() may return true, but QGIS project is not set to return geometry on response
      this.isGeoLayer = undefined !== this.table.features.find(f => f.geometry);

      const downloadformats       = layer.isDownloadable() ? layer.getDownloadableFormats() : [];

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

      VM.$on('reload', () => { this.reloadLayout(); });
  
      this.showChart = throttle(async () => {
        this.chart = !this.chart;
        await this.$nextTick();
        this.chartContainer = this.chartContainer ||  $('#chart_content');
        this.$emit(this.chart ? 'show-chart': 'hide-chart', this.chartContainer, { relations: [this.relation], fid: this.feature.attributes[G3W_FID] });
      });

      await this.$nextTick();

      SIDEBARWIDTH = GUI.getSize({ element:'sidebar', what:'width' });

      this.relation.title = this.relation.name;

      if (!this.one) {
        this.relationDataTable = $(this.$refs.relationtable).DataTable({
          pageLength:     10,
          bLengthChange:  true,
          scrollResize:   true,
          scrollCollapse: true,
          scrollX:        true,
          responsive:     true,
          order:          [ this.showTools ? 1 : 0, 'asc' ],
          columnDefs:     [{ orderable:  this.showTools, targets: 0 }],
          autoWidth:      false,
        });
        this.tableHeaderHeight = $('.query-relation  div.dataTables_scrollHeadInner').height();

      }

      // resize after popping child relation 
      GUI.on('pop-content', setTimeout(() => this.resize()));
    },

    /**
     * @returns { Promise<void> }
     */
    async resize() {
      // skip when ..
      if (!this.$refs.query_relation || 'none' === this.$refs.query_relation.parentNode.style.display) {
        return;
      }

      // in case of waiting table
      const table      = $(this.$refs.query_relation).find('div.dataTables_scrollBody');
      table.height(
        $(".content").height()
        - this.tableHeaderHeight
        - $('.content_breadcrumb')                       .outerHeight()
        - $('.navbar-header')                            .outerHeight()
        - $('.close-panel-block')                        .outerHeight()
        - $(this.$refs['relation-header'])               .outerHeight()
        - $('.dataTables_filter').last()                 .outerHeight()
        - $('.dataTables_paginate.paging_simple_numbers').outerHeight()
        - $('.dataTables_scrollHead').last()             .outerHeight()
      );

      /** In case of layer that has form Structure s */
      if (this.table.rowFormStructure) {
        $('.row-wrap-tabs > .tabs-wrapper').width(
          table.width()
          - $(this.$refs.relationtable).find('tr.selected > td').outerWidth()
          - 20
        );
      }

      this.reloadLayout();
    },

    /**
     * @param type
     */
    saveRelation(type) {
      this.$emit('save-relation', type);
      this.downloadButton.toggled = false;
    },

    /**
     * @param event
     * @param row
     *
     * @returns { Promise<void> }
     */
    async showFormStructureRow(event, row) {
      this.table.rowFormStructure = this.table.rowFormStructure === row ? null : row;
      this.fields                 = this.getRowFields(row);
      await this.$nextTick();
      $('#relationtable_wrapper div.dataTables_scrollBody').css('overflow-x', this.table.rowFormStructure  ? 'hidden' : 'auto');
      this.resize();
    },

    /**
     * @param index
     */
    editFeature(index) {
      GUI
        .getService('queryresults')
        .editFeature({
          layer: {
            id: this.table.layerId,
            attributes: this.table.fields,
          },
          feature: this.table.features[index],
        });
    },

    /**
     * @param row
     *
     * @returns {*}
     */
    getRowFields(row) {
      return this.table.fields.map((field, index) => {
        field.value = row[index];
        field.query = true;
        field.input = { type: `${this.getFieldType(field)}` };
        return field;
      });
    },

    /**
     * @FIXME add description
     */
    reloadLayout() {
      if (this.relationDataTable) {
        this.relationDataTable.columns.adjust();
      }
    },

    /**
     * @FIXME add description
     */
    back() {
      this.$parent.setRelationsList();
    },

    /**
     * @param type
     * @param value
     *
     * @returns { boolean }
     */
    fieldIs(type, value) {
      return this.getFieldType(value) === type;
    },

    /**
     * @param type
     * @param value
     *
     * @returns { boolean }
     */
    is(type, value) {
      return this.fieldIs(type, value);
    },

    /**
     * @param evt
     */
    moveFnc(evt) {
      const sidebarHeaderSize             =  $('.sidebar-collapse').length ? 0 : SIDEBARWIDTH;
      const size                          = evt.pageX+2 - sidebarHeaderSize;
      this.$refs.tablecontent.style.width = `${size}px`;
      this.$refs.chartcontent.style.width = `${$(this.$refs.relationwrapper).width() - size - 10}px`;
    },

  },

  watch: {

    /**
     * When showing a relation directly
     */
    table: {
      immediate: true,
      handler(table) {
        if (table && table.rows.length) {
          this.createTable();
        }
      },
    },

    /**
     * @FIXME add description
     */
    async chart() {
      await this.$nextTick();
      this.resize();
    },

    /**
     * @FIXME add description
     */
    async headercomponent() {
      await this.$nextTick();
      this.resize();
    },

  },

  beforeCreate() {
    this.delayType = 'debounce';
  },

  /**
   * @fires hide-chart
   */
  async beforeDestroy() {
    // skip when ..
    if (!this.relationDataTable) {
      return;
    }
    this.relationDataTable.destroy();
    this.relationDataTable = null;
    if (this.chartContainer) {
      this.$emit('hide-chart', this.chartContainer);
    }
    this.chartContainer = null;
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
  .table-tools {
    display: flex;
    justify-content: space-between;
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