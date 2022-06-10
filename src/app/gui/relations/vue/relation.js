import {G3W_FID} from 'constant';
import Field from 'gui/fields/g3w-field.vue';
import DownloadFormats from 'gui/queryresults/vue/components/actiontools/downloadformats.vue';
import CatalogLayersStoresRegistry  from 'core/catalog/cataloglayersstoresregistry';
import template from './relation.html';
import GUI  from 'gui/gui';
import utils from 'core/utils/utils';
import RelationPageEventBus  from './relationeventbus';
import {fieldsMixin, resizeMixin}  from 'gui/vue/vue.mixins';
let SIDEBARWIDTH;

export default  {
  template,
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
      return this.relation.type === 'ONE'
    }
  },
  methods: {
    async resize(){
      await this.$nextTick();
      const tableHeight = $(".content").height();
      setTimeout(()=>{
        const datatableBody = $('.query-relation div.dataTables_scrollBody').last();
        const OtherElementHeight = $('.navbar-header').height() + $('.close-panel-block').height() + $(this.$refs['relation-header']).height() + $('.dataTables_filter').last().height() + $('.dataTables_scrollHead').last().height() + (this.isMobile() ? 20 : 0);
        datatableBody.height(tableHeight - this.tableHeaderHeight - OtherElementHeight );
        if (this.table.rowFormStructure) {
          const width = datatableBody.width() - 60;
          $('.row-wrap-tabs > .tabs-wrapper').width(width);
        }
      });
      this.relationDataTable && this.relationDataTable.columns.adjust();
    },
    saveRelation(type){
      this.$emit('save-relation', type);
      this.downloadButton.toggled = false;
    },
    async showFormStructureRow(event, row){
      this.table.rowFormStructure = this.table.rowFormStructure === row ? null : row;
      this.fields = this.getRowFields(row);
      this.resize();
      await this.$nextTick();
      $('#relationtable_wrapper div.dataTables_scrollBody').css('overflow-x', this.table.rowFormStructure  ? 'hidden' : 'auto');
      this.resize();
    },
    editFeature(featureId){
      const queryResultsService = GUI.getService('queryresults');
      queryResultsService.editFeature({
        layerId: this.table.layerId,
        featureId
      });
    },
    getRowFields(row){
      const fields = this.table.fields.map((field, index)=> {
        field.value = row[index];
        field.query = true;
        field.input = {
          type: `${this.getFieldType(field)}`
        };
        return field;
      });
      return fields;
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
  created() {
    const layer = CatalogLayersStoresRegistry.getLayerById(this.table.layerId);
    this.isEditable =  layer.isEditable() && !layer.isInEditing();
    const downloadformats = layer.isDownloadable() ? layer.getDownloadableFormats() : [];
    const downloadformatsLength = downloadformats.length;
    if (downloadformatsLength > 0){
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
    this.showChart = utils.throttle(async ()=> {
      this.chart = !this.chart;
      await this.$nextTick();
      this.chartContainer = this.chartContainer ||  $('#chart_content');
      const relationData = {
        relations: [this.relation],
        fid: this.feature.attributes[G3W_FID],
      };
      this.$emit(this.chart ? 'show-chart': 'hide-chart', this.chartContainer, relationData);
    });
  },
  async mounted() {
    SIDEBARWIDTH = GUI.getSize({element:'sidebar', what:'width'});
    this.relation.title = this.relation.name;
    await this.$nextTick();
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
      $('.row-form').tooltip();
      this.tableHeaderHeight = $('.query-relation  div.dataTables_scrollHeadInner').height();
      this.resize();
    }
  },
  beforeDestroy(){
    this.relationDataTable.destroy();
    this.relationDataTable = null;
    this.chartContainer && this.$emit('hide-chart', this.chartContainer);
    this.chartContainer = null;
    this.tableHeaderHeight = null;
  }
};