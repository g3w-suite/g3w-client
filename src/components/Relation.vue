<!-- ORIGINAL SOURCE: -->
<!-- gui/relations/vue/relation.html@v3.4 -->
<!-- gui/relations/vue/relation.js@v3.4 -->

<template>
  <div class="query-relation" ref="query_relation" :class="isMobile() ? 'mobile' : null" style="margin-top: 3px;" v-if="table">
    <div class="header skin-background-color lighten" ref="relation-header" style="padding: 3px; display: flex; justify-content: space-between; align-items: center; width: 100%;">
      <div style="border-radius: 3px;" :style="{fontSize: isMobile() ? '1em' : '1.3em'}" class="g3w-long-text">
        <span v-if="showrelationslist" style="font-size: 0.8em;" v-t-tooltip:right.create="'sdk.relations.back_to_relations'" class="action-button-icon action-button" :class="g3wtemplate.getFontClass('exit')" @click.stop="back"></span>
        <span style="font-weight: bold" class="relation-tile skin-color"> {{ relation.name }}</span>
      </div>
      <div class="relations-table-tools" v-if="table.rows.length" style="font-size: 1.1em; margin-bottom: 3px">
          <span v-if="downloadButton" style="padding: 5px;" v-download class="action-button-icon action-button"
            :class="[g3wtemplate.getFontClass('download'), {'toggled-white': downloadButton.toggled}]" @click="downloadButton.handler" v-t-tooltip:left.create="downloadButton.tooltip"></span>
          <span v-if="showChartButton" style="padding: 5px;" class="action-button-icon action-button"
            :class="[g3wtemplate.getFontClass('chart'), chart ? 'toggled-white' : '']" @click.stop="showChart" v-t-tooltip:bottom.create="'sdk.tooltips.show_chart'"></span>
        </div>
    </div>
    <div v-if="table.rows.length" style="display: flex; justify-content: space-between; margin-bottom: 5px; margin-top: 3px; height: 95%;"  ref="relationwrapper">
      <div id="table_content" :style="{width: chart ? '70%' : '100%', marginRight: chart ? '8px' : '3px', position: 'relative' }" ref="tablecontent">
        <template v-if="headercomponent">
          <div style="width: 100%; display: flex; margin-left: auto; margin-bottom: 5px; margin-right: 4px;">
            <component :is="headercomponent" :layer="downloadLayer.state" :config="downloadLayer.config"/>
          </div>
        </template>
        <table ref="relationtable" class="hover relationtable table table-striped row-border" style="width:100%">
          <thead>
            <tr style="height: 0! important">
              <th v-if="table.formStructure || isEditable" :style="{minWidth: `${((1*!!table.formStructure) + (1*isEditable))*30}px`, padding: '0 !important' }"></th>
              <th v-for="column in table.columns">{{ column }}</th>
            </tr>
          </thead>
          <tbody>
          <tr v-for="(row, index) in table.rows" :key="table.rows_fid[index]" :class="{'selected': table.rowFormStructure === row}">
            <td v-if="table.formStructure || isEditable">
              <span v-if="table.formStructure" @click.stop="showFormStructureRow($event, row)" style="cursor: pointer" :current-tooltip="table.rowFormStructure === row ? 'sdk.tooltips.relations.form_to_row': 'sdk.tooltips.relations.row_to_form'"
                class="action-button row-form skin-color" v-t-tooltip:right.create="table.rowFormStructure === row ? 'sdk.tooltips.relations.form_to_row': 'sdk.tooltips.relations.row_to_form'"
                :class="[table.rowFormStructure === row ? g3wtemplate.getFontClass('minus') :  g3wtemplate.getFontClass('table')]"></span>
              <span v-if="isEditable" @click.stop="editFeature(index)" class="action-button row-form skin-color" v-t-tooltip:right.create="'Edit'"
                :class="g3wtemplate.getFontClass('pencil')"></span>
            </td>
            <template v-if="table.formStructure && table.rowFormStructure === row">
              <td :colspan="table.columns.length" class="row-wrap-tabs">
                <tabs :layerid="table.layerId" :feature="table.features[index]" :fields="fields" :tabs="table.formStructure"/>
              </td>
            </template>
            <template v-else>
              <td v-for="value in row">
                <field :state="{value:value}"/>
              </td>
            </template>
          </tr>
          </tbody>
        </table>
      </div>
      <g3w-resize :show="chart" :moveFnc="moveFnc" :where="'content'" class="skin-border-color lighten" style="border-style: solid; border-width: 0 1px 0 1px"/>
      <div v-show="chart" id="chart_content" :style="{width: chart ? '30%' : '0', paddingBottom: '5px', marginBottom: '5px', marginLeft: '8px' }" ref="chartcontent"></div>
    </div>
    <div v-else class="dataTables_scrollBody" style="font-weight: bold; margin-top: 10px; font-size: 1.1em; display: flex; justify-content: space-between;">
      <span v-t="'sdk.relations.no_relations_found'"></span>
    </div>
  </div>
</template>

<script>
import {G3W_FID} from 'constant';
import Field from 'components/FieldG3W.vue';
import DownloadFormats from 'components/QueryResultsActionDownloadFormats.vue';

const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');
const GUI = require('gui/gui');
const {throttle} = require('core/utils/utils');
const RelationPageEventBus = require('gui/relations/vue/relationeventbus');
const {fieldsMixin, resizeMixin} = require('gui/vue/vue.mixins');
let SIDEBARWIDTH;

export default {
  props: ['table', 'feature', 'relation', 'previousview', 'showChartButton', 'cardinality'],
  inject: ['relationnoback'],
  mixins: [fieldsMixin, resizeMixin],
  components: {
    Field
  },
  data(){
    return {
      feature: null,
      fields: null,
      chart: false,
      headercomponent: null,
      downloadButton: null,
      downloadLayer: {
        state: null,
        config: {
          downloads:[]
        }
      }
    }
  },
  computed: {
    showrelationslist() {
      return this.previousview === 'relations' && !this.relationnoback;
    },
    one() {
      return this.relation.type === 'ONE';
    }
  },
  methods: {
    async createTable(){
      const layer = CatalogLayersStoresRegistry.getLayerById(this.table.layerId);
      this.isEditable =  layer.isEditable() && !layer.isInEditing();
      const downloadformats = layer.isDownloadable() ? layer.getDownloadableFormats() : [];
      const downloadformatsLength = downloadformats.length;
      if (downloadformatsLength > 0) {
        this.downloadButton = {
          toggled: false,
          tooltip: downloadformatsLength > 1 ? 'Downloads' : `sdk.tooltips.download_${downloadformats[0]}`,
          handler: downloadformatsLength > 1 ? async ()=> {
            this.downloadButton.toggled = !this.downloadButton.toggled;
            this.downloadLayer.state = this.downloadLayer.state || layer.state;
            this.downloadLayer.config.downloads = this.downloadLayer.config.downloads.length ? this.downloadLayer.config.downloads : downloadformats.map(format =>(
              {
                id: format,
                format,
                cbk: () => {
                  this.saveRelation(layer.getDownloadUrl(format));
                  this.headercomponent = null;
                },
                download: true
              })
            );
            this.headercomponent = this.downloadButton.toggled ? DownloadFormats : null;
          } : () => this.saveRelation(layer.getDownloadUrl(downloadformats[0]))
        }
      }
      RelationPageEventBus.$on('reload', () => {
        this.reloadLayout();
      });
      this.showChart = throttle(async ()=> {
        this.chart = !this.chart;
        await this.$nextTick();
        this.chartContainer = this.chartContainer ||  $('#chart_content');
        const relationData = {
          relations: [this.relation],
          fid: this.feature.attributes[G3W_FID],
        };
        this.$emit(this.chart ? 'show-chart': 'hide-chart', this.chartContainer, relationData);
      });
      await this.$nextTick();
      SIDEBARWIDTH = GUI.getSize({element:'sidebar', what:'width'});
      this.relation.title = this.relation.name;

      if (!this.one) {
        this.relationDataTable = $(this.$refs.relationtable).DataTable( {
          "pageLength": 10,
          "bLengthChange": true,
          "scrollResize": true,
          "scrollCollapse": true,
          "scrollX": true,
          "responsive": true,
          "order": [ this.table.formStructure ? 1 : 0, 'asc' ],
          "columnDefs": [{"orderable":  !this.table.formStructure, "targets": 0}]
        });
        this.tableHeaderHeight = $('.query-relation  div.dataTables_scrollHeadInner').height();
        //this.resize();
      }
      //In case of pop child relation need to resize
      GUI.on('pop-content', this.resize);
    },
    async resize(){
      // in case of waiting table
      if (this.$refs.query_relation && this.$refs.query_relation.parentNode.style.display !== 'none') {
        const tableHeight = $(".content").height();
        const datatableBody = $(this.$refs.query_relation).find('div.dataTables_scrollBody');
        const breadcrumbHeight = $('.content_breadcrumb').outerHeight();
        const OtherElementHeight = breadcrumbHeight +
          $('.navbar-header').outerHeight() +
          $('.close-panel-block').outerHeight() +
          $(this.$refs['relation-header']).outerHeight() +
          $('.dataTables_filter').last().outerHeight() +
          $('.dataTables_paginate.paging_simple_numbers').outerHeight() +
          $('.dataTables_scrollHead').last().outerHeight();
        datatableBody.height(tableHeight - this.tableHeaderHeight - OtherElementHeight );
        if (this.table.rowFormStructure) {
          const width = datatableBody.width() - $(this.$refs.relationtable).find('tr.selected > td').outerWidth() - 20;
          $('.row-wrap-tabs > .tabs-wrapper').width(width);
        }
        this.reloadLayout();
      }
    },
    saveRelation(type){
      this.$emit('save-relation', type);
      this.downloadButton.toggled = false;
    },
    async showFormStructureRow(event, row){
      this.table.rowFormStructure = this.table.rowFormStructure === row ? null : row;
      this.fields = this.getRowFields(row);
      await this.$nextTick();
      $('#relationtable_wrapper div.dataTables_scrollBody').css('overflow-x', this.table.rowFormStructure  ? 'hidden' : 'auto');
      this.resize();
    },
    editFeature(index){
      const queryResultsService = GUI.getService('queryresults');
      queryResultsService.editFeature({
        layer: {
          id: this.table.layerId,
          attributes: this.table.fields
        },
        feature: this.table.features[index]
      });
    },
    getRowFields(row){
      return this.table.fields.map((field, index)=> {
        field.value = row[index];
        field.query = true;
        field.input = {
          type: `${this.getFieldType(field)}`
        };
        return field;
      });
    },
    reloadLayout() {
      this.relationDataTable && this.relationDataTable.columns.adjust();
    },
    back() {
      this.$parent.setRelationsList();
    },
    fieldIs(type, value) {
      const fieldType = this.getFieldType(value);
      return fieldType === type;
    },
    is(type,value) {
      return this.fieldIs(type, value);
    },
    moveFnc(evt){
      const sidebarHeaderSize =  $('.sidebar-collapse').length ? 0 : SIDEBARWIDTH;
      const size = evt.pageX+2 - sidebarHeaderSize;
      this.$refs.tablecontent.style.width = `${size}px`;
      this.$refs.chartcontent.style.width = `${$(this.$refs.relationwrapper).width() - size - 10}px`;
    }
  },
  watch: {
    // in case of show relation directly
    table: {
      immediate: true,
      handler(table) {
        table && table.rows.length && this.createTable();
      }
    },
    async chart(){
      await this.$nextTick();
      this.resize();
    },
    async headercomponent(){
      await this.$nextTick();
      this.resize();
    }
  },
  beforeCreate() {
    this.delayType = 'debounce';
  },
  async beforeDestroy(){
    if (this.relationDataTable){
      this.relationDataTable.destroy();
      this.relationDataTable = null;
      this.chartContainer && this.$emit('hide-chart', this.chartContainer);
      this.chartContainer = null;
      this.tableHeaderHeight = null;
      GUI.off('pop-content', this.resize);
    }
  }
};
</script>