import Tabs from "gui/tabs/tabs.vue";
import Field from 'gui/fields/g3w-field.vue';
const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');
import { createCompiledTemplate } from 'gui/vue/utils';
const compiledTemplate = createCompiledTemplate(require('./relation.html'));
const RelationPageEventBus = require('./relationeventbus');
const {fieldsMixin, resizeMixin} = require('gui/vue/vue.mixins');
let relationDataTable;

module.exports = {
  ...compiledTemplate,
  props: ['table', 'relation', 'previousview'],
  inject: ['relationnoback'],
  mixins: [fieldsMixin, resizeMixin],
  components: {
    Field,
    Tabs
  },
  data(){
    return {
      feature: null,
      fields: null
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
      const tableHeaderHeight = $('.query-relation  div.dataTables_scrollHeadInner').height();
      $('.query-relation  div.dataTables_scrollBody').height(tableHeight - tableHeaderHeight - 160);
      if (this.table.rowFormStructure) {
        await this.$nextTick();
        const width =  $('#relationtable_wrapper').width() - 60;
        $('.row-wrap-tabs .tabs-wrapper').width(width);
      }
    },
    saveRelation(type){
      this.$emit('save-relation', type)
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
    }
  },
  created() {
    const layer = CatalogLayersStoresRegistry.getLayerById(this.table.layerId);
    this.showDownloadButtons = {
      shapefile: layer.isXlsDownlodable(),
      gpx: layer.isGpxDownlodable(),
      csv: layer.isCsvDownlodable(),
      xls:layer.isXlsDownlodable(),
    };
    RelationPageEventBus.$on('reload', () => {
      this.reloadLayout();
    })
  },
  mounted () {
    this.relation.title = this.relation.name;
    this.$nextTick(() => {
      $('.query-relation .header span[data-toggle="tooltip"]').tooltip();
      if (!this.one) {
        relationDataTable = $('#relationtable').DataTable( {
          "pageLength": 10,
          "bLengthChange": false,
          "scrollResize": true,
          "scrollCollapse": true,
          "scrollX": true,
          "order": [ this.table.formStructure ? 1 : 0, 'asc' ],
          "columnDefs": [
            {
              "orderable":  !this.table.formStructure,
              "targets": 0
            }
          ]
        });
        $('.row-form').tooltip();
        this.resize();
      }
    })
  },
  beforeDestroy(){
    relationDataTable.destroy();
    relationDataTable = null;
  }
};