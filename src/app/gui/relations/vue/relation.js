import Tabs from "gui/tabs/tabs.vue";
import Field from 'gui/fields/g3w-field.vue';
import { createCompiledTemplate } from 'gui/vue/utils';
const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');
const compiledTemplate = createCompiledTemplate(require('./relation.html'));
const GUI = require('gui/gui');
const RelationPageEventBus = require('./relationeventbus');
const {fieldsMixin, resizeMixin} = require('gui/vue/vue.mixins');
let relationDataTable;
let SIDEBARWIDTH;

module.exports = {
  ...compiledTemplate,
  props: ['table', 'relation', 'previousview', 'showChartButton'],
  inject: ['relationnoback'],
  mixins: [fieldsMixin, resizeMixin],
  components: {
    Field,
    Tabs
  },
  data(){
    return {
      feature: null,
      fields: null,
      chart: false
    }
  },
  computed: {
    showrelationslist() {
      return this.previousview === 'relations' && !this.relationnoback;
    },
    one() {
      return this.relation.type === 'ONE'
    }
  },
  methods: {
    async resize(){
      await this.$nextTick();
      const tableHeight = $(".content").height();
      setTimeout(()=>{
        const datatatbleBody = $('.query-relation  div.dataTables_scrollBody');
        const OtherElementHeight = $('.navbar-header').height() + $('.close-panel-block').height() + $('.query_relation .header').height() + $('#relationtable_filter').height() + $('.dataTables_scrollHead').height() + (this.isMobile() ? 20 : 0);
        datatatbleBody.height(tableHeight - this.tableHeaderHeight - OtherElementHeight );
        if (this.table.rowFormStructure) {
          const width = datatatbleBody.width() - 60;
          $('.row-wrap-tabs .tabs-wrapper').width(width);
        }
      });
      relationDataTable && relationDataTable.columns.adjust();
    },
    saveRelation(type){
      this.$emit('save-relation', type)
    },
    async showChart(){
      this.chart = !this.chart;
      await this.$nextTick();
      this.chartContainer = this.chartContainer ||  $('#chart_content');
      this.$emit(this.chart ? 'show-chart': 'hide-chart', this.chartContainer);
    },
    async showFormStructureRow(event, row){
      this.table.rowFormStructure = this.table.rowFormStructure === row ? null : row;
      this.feature = this.getTabFeature(row);
      this.fields = this.getRowFields(row);
      this.resize();
      await this.$nextTick();
      $('#relationtable_wrapper div.dataTables_scrollBody').css('overflow-x', this.table.rowFormStructure  ? 'hidden' : 'auto');
    },
    getRowFields(row){
      const fields = this.table.fields.map((field, index)=> {
        field.value = row[index];
        field.query = true;
        field.input = {
          type: `${this.getFieldType(field.value)}_field`
        };
        return field;
      });
      return fields;
    },
    getTabFeature(row){
      const feature = {
        attributes: {}
      };
      this.table.fields.forEach((field, index) => {
        feature.attributes[field.name] = row[index];
      });
      return feature;
    },
    reloadLayout() {
      relationDataTable && relationDataTable.columns.adjust();
    },
    back: function() {
      this.$parent.setRelationsList();
    },
    fieldIs: function(type, value) {
      const fieldType = this.getFieldType(value);
      return fieldType === type;
    },
    is: function(type,value) {
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
    async chart(bool){
      await this.$nextTick();
      this.resize();
    }
  },
  beforeCreate() {
    this.delayType = 'debounce';
  },
  created() {
    const layer = CatalogLayersStoresRegistry.getLayerById(this.table.layerId);
    this.showDownloadButtons = {
      shapefile: layer.isShpDownlodable(),
      gpx: layer.isGpxDownlodable(),
      csv: layer.isCsvDownlodable(),
      xls:layer.isXlsDownlodable(),
    };
    RelationPageEventBus.$on('reload', () => {
      this.reloadLayout();
    })
  },
  async mounted() {
    SIDEBARWIDTH = GUI.getSize({element:'sidebar', what:'width'});
    this.relation.title = this.relation.name;
    await this.$nextTick();
    if (!this.one) {
      relationDataTable = $('#relationtable').DataTable( {
        "pageLength": 10,
        "bLengthChange": false,
        "scrollResize": true,
        "scrollCollapse": true,
        "scrollX": true,
        "responsive": true,
        "order": [ this.table.formStructure ? 1 : 0, 'asc' ],
        "columnDefs": [{"orderable":  !this.table.formStructure, "targets": 0}]
      });
      $('.row-form').tooltip();
      this.tableHeaderHeight = $('.query-relation  div.dataTables_scrollHeadInner').height();
      this.resize();
    }
  },
  beforeDestroy(){
    relationDataTable.destroy();
    relationDataTable = null;
    this.chartContainer && this.$emit('hide-chart', this.chartContainer);
    this.chartContainer = null;
    this.tableHeaderHeight = null;
  }
};