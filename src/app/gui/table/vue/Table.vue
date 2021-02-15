<template>
  <div id="open_attribute_table" style="margin-top: 5px">
    <table ref="attribute_table" v-if="hasHeaders()"  id="layer_attribute_table" class="table table-striped row-border compact nowrap" style="width:100%">
      <thead>
        <tr>
          <th v-for="(header, index) in state.headers">
            <span v-if="index === 0">
              <input type="checkbox" id="attribute_table_select_all_rows" :checked="state.selectAll" class="magic-checkbox" :disabled="state.nofilteredrow || state.features.length === 0">
              <label style="margin-bottom:0 !important;" @click.capture.stop.prevent="selectAllRow" for="attribute_table_select_all_rows"><span style="padding:5px"></span></label>
            </span>
            <span v-else>{{ header.label }}</span>
          </th>
        </tr>
      </thead>
      <table-body :headers="state.headers" :filter=state.tools.filter :features="state.features" :addRemoveSelectedFeature="addRemoveSelectedFeature" :zoomAndHighLightFeature="zoomAndHighLightFeature"></table-body>
    </table>
    <div id="noheaders" v-t="'dataTable.no_data'" v-else>
    </div>
  </div>
</template>

<script>
  import TableBody from "./components/tablebody.vue";
  import SelectRow from './components/selectrow.vue';
  import G3wTableToolbar from './components/g3w-table-toolbar.vue';
  import Field from 'gui/fields/g3w-field.vue';
  const debounce = require('core/utils/utils').debounce;
  const {resizeMixin} = require('gui/vue/vue.mixins');
  const GUI = require('gui/gui');
  let dataTable;
  let fieldsComponents = [];
  export default {
    name: "G3WTable",
    mixins: [resizeMixin],
    data() {
      return {
        tableBodyComponent:null,
        state: null,
        table: null,
        selectedRow: null
      }
    },
    components: {
      TableBody
    },
    methods: {
      getDataFromBBOX(){
        this.$options.service.getDataFromBBOX();
      },
      toggleFilterToken(){
        this.$options.service.toggleFilterToken();
      },
      clearAllSelection(){
        this.$options.service.clearLayerSelection();
      },
      switchSelection(){
        this.$options.service.switchSelection();
      },
      selectAllRow(){
        this.state.features.length && this.$options.service.selectAllFeatures();
      },
      _setLayout: function() {
        this.$options.service._setLayout();
      },
      zoomAndHighLightFeature: function(feature, zoom=true) {
        feature.geometry && this.$options.service.zoomAndHighLightFeature(feature, zoom);
      },
      addRemoveSelectedFeature(feature){
        this.$options.service.addRemoveSelectedFeature(feature);
      },
      async reloadLayout() {
        await this.$nextTick();
        dataTable && dataTable.columns.adjust();
      },
      hasHeaders() {
        return !!this.state.headers.length;
      },
      createdContentBody() {
        fieldsComponents = fieldsComponents.filter(fieldComponent => {
          fieldComponent.$destroy();
          return false;
        });
        const trDomeElements = $('#layer_attribute_table tbody tr');
        trDomeElements.css('cursor', 'pointer');
        trDomeElements.each((index, rowElement) => {
          if (this.state.features.length) {
            const feature = this.state.features[index];
            const hasGeometry = !!feature.geometry;
            $(rowElement).addClass('feature_attribute');
            feature.selected && $(rowElement).addClass('selected');
            $(rowElement).on('click', ()=> {
              hasGeometry && this.zoomAndHighLightFeature(feature);
            });
            $(rowElement).on('mouseover', () => {
              hasGeometry && this.zoomAndHighLightFeature(feature, false);
            });
            $(rowElement).children().each((index, element)=> {
              const header = this.state.headers[index];
              let contentDOM;
              if (header === null) {
                const SelectRowClass = Vue.extend(SelectRow);
                const SelectRowInstance = new SelectRowClass({
                  propsData: {
                    feature
                  }
                });
                SelectRowInstance.$on('selected', feature => this.$options.service.addRemoveSelectedFeature(feature));
                this.$watch(
                  () => feature.selected,
                  function (selected) {
                    selected ? $(rowElement).addClass('selected'): $(rowElement).removeClass('selected');
                  }
                );
                contentDOM = SelectRowInstance.$mount().$el;
              } else {
                const fieldClass = Vue.extend(Field);
                const fieldInstance = new fieldClass({
                  propsData: {
                    state: {
                      value: feature.attributes[header.name]
                    }
                  }
                });
                fieldInstance.$mount();
                fieldsComponents.push(fieldInstance);
                contentDOM = fieldInstance.$el
              }
              $(element).html(contentDOM);
            })
          }
        });
        setTimeout(()=> this.reloadLayout(), 0)
      },
      async resize() {
        await this.$nextTick();
        const tableHeight = $(".content").height();
        const tableHeaderHeight = $('#open_attribute_table  div.dataTables_scrollHeadInner').height();
        $('#open_attribute_table  div.dataTables_scrollBody').height(tableHeight - tableHeaderHeight - 130);
      }
    },
    beforeCreate(){
      this.delayType = 'debounce';
    },
    async mounted() {
      this.setContentKey = GUI.onafter('setContent', this.resize);
      const hideElements = () => {
        $('.dataTables_info, .dataTables_length').hide();
        $('.dataTables_paginate').css({
          'display': 'flex',
          'justify-content': 'space-between',
          'font-size': '0.8em',
          'margin-top': '5px'
        });
        $('.dataTables_filter').css('float', 'right');
        $('.dataTables_paginate').css('margin', '0');
      };
      await this.$nextTick();
      this.first = false;
      const commonDataTableOptions = {
        "lengthMenu": this.state.pageLengths,
        "pageLength": this.state.pageLength,
        "scrollX": true,
        "processing": false,
        "scrollCollapse": true,
        "sSearch": false,
        "order": [ 1, 'asc' ],
        "dom": 'l<"#g3w-table-toolbar">frtip',
        "columnDefs": [ {
          "targets": 0,
          "orderable": false,
          "width": '1%'
        } ]
      };
      if (this.state.pagination) {
        //pagination
        dataTable = $('#open_attribute_table table').DataTable({
          ...commonDataTableOptions,
          "columns": this.state.headers,
          "ajax": debounce((data, callback) => {
            //remove listeners
            const trDomeElements = $('#open_attribute_table table tr');
            trDomeElements.each(element => {
              $(element).off('click');
              $(element).off('mouseover');
            });
            this.$options.service.getData(data)
              .then(async serverData => {
                callback(serverData);
                await this.$nextTick();
                this.createdContentBody();
                this.isMobile() && hideElements();
              })
              .catch(error => {
                console.log(error)
              })
          }, 800),
          "serverSide": true,
          "deferLoading": this.state.allfeatures
        });
        this.$options.service.on('ajax-reload', dataTable.ajax.reload)
      } else { // no pagination all data
        dataTable = $('#open_attribute_table table').DataTable({
          ...commonDataTableOptions,
          searchDelay: 600
        });
        const debounceSearch = debounce(() => {
          this.$options.service.setFilteredFeature(dataTable.search() ? dataTable.rows( {search:'applied'} )[0]: undefined)
        }, 600);
        dataTable.on('search.dt', debounceSearch);
        dataTable.on('length.dt', (evt, settings, length)=>{
          this.$options.service.setAttributeTablePageLength(length)
        })
      }

      this.isMobile() && hideElements();
      const G3WTableToolbarClass = Vue.extend(G3wTableToolbar);
      const G3WTableToolbarInstance = new G3WTableToolbarClass({
        propsData: {
          tools: this.state.tools,
          geolayer: this.state.geolayer,
          switchSelection: this.switchSelection,
          clearAllSelection: this.clearAllSelection,
          toggleFilterToken: this.toggleFilterToken,
          getDataFromBBOX: this.getDataFromBBOX
        }
      });
      $('#g3w-table-toolbar').html(G3WTableToolbarInstance.$mount().$el);
      this.$options.service.on('redraw', data =>{
        dataTable.clear();
        dataTable.draw(false);
        dataTable.search('');
        setTimeout(()=>{
          dataTable.rows.add(data);
          dataTable.draw(false);
          this.createdContentBody();
          this.isMobile() && hideElements();
        })
      })
    },
    beforeDestroy() {
      this.$options.service.clear();
      this.$options.service.off('ajax-reload');
      this.$options.service.off('redraw');
      GUI.un('setContent', this.setContentKey);
      dataTable.destroy(true);
      dataTable = null;
    }
  }
</script>

<style scoped>
  .geometry {
    cursor: pointer
  }
  #noheaders {
    background-color: #ffffff;
    font-weight: bold;
    margin-top: 10px;
  }
  </style>
