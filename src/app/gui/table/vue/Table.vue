<template>
  <div id="open_attribute_table">
    <table-row-form-input v-if="hasHeaders()" :selectRow="true" :id="'layer_attribute_table'" @hook:mounted="tableMounted" :custom-class="'display compact nowrap'"
      :table="{
      formStructure: state.formStructure,
       fields: state.fields,
       columns: state.headers.map(header=> header.label),
       rows:state.features.map(feature=> state.headers.map(header => feature.attributes[header.name]))}" @show-hide-form-structure="resize()">
      <template v-slot:header>
        <th v-for="header in state.headers">{{ header.label }}</th>
      </template>
    </table-row-form-input>
    <div id="noheaders" v-t="'dataTable.no_data'" v-else>
    </div>
  </div>
</template>

<script>
  import TableRowFormInput from "./TableRowFormInput.vue";
  const Field = require('gui/fields/g3w-field.vue');
  const debounce = require('core/utils/utils').debounce;
  const {resizeMixin} = require('gui/vue/vue.mixins');
  const GUI = require('gui/gui');
  let dataTable;
  let fieldsComponents = [];
  export default {
    name: "G3WTable",
    mixins: [resizeMixin],
    data: function() {
      return {
        tableBodyComponent:null,
        state: null,
        table: null,
        selectedRow: null
      }
    },
    components: {
      TableRowFormInput,
      Field
    },
    methods: {
      toggleRow(index) {
        this.selectedRow = this.selectedRow === index ? null : index;
      },
      _setLayout: function() {
        this.$options.service._setLayout();
      },
      zoomAndHighLightSelectedFeature: function(feature, zoom=true) {
        feature.geometry && this.$options.service.zoomAndHighLightSelectedFeature(feature, zoom);
      },
      async reloadLayout() {
        await this.$nextTick();
        dataTable && dataTable.columns.adjust();
      },
      hasHeaders() {
        return !!this.state.headers.length;
      },
      createdContentBody() {
        fieldsComponents = fieldsComponents.filter((fieldComponent) => {
          fieldComponent.$destroy();
          return false;
        });
        const trDomeElements = $('#layer_attribute_table tbody tr');
        trDomeElements.css('cursor', 'pointer');
        trDomeElements.each((index, element) => {
          const feature = this.state.features[index];
          const hasGeometry = !!feature.geometry;
          $(element).addClass('feature_attribute');
          $(element).on('click', ()=> {
            const selected = $(element).attr("selected");
            trDomeElements.attr('selected', false);
            $(element).attr( "selected", !selected );
            hasGeometry && !selected && this.zoomAndHighLightSelectedFeature(feature);
          });
          $(element).on('mouseover', () => {
            hasGeometry && this.zoomAndHighLightSelectedFeature(feature, false);
          });
          $(element).children().each((index, element)=> {
            const header = this.state.headers[index];
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
            $(element).html(fieldInstance.$el);
          })
        });
        setTimeout(() => {
          this.reloadLayout()
        }, 0)
      },
      async resize() {
        await this.$nextTick();
        const tableHeight = $(".content").height();
        const tableHeaderHeight = $('#open_attribute_table  div.dataTables_scrollHeadInner').height();
        $('#open_attribute_table  div.dataTables_scrollBody').height(tableHeight - tableHeaderHeight - 130);
      },
      async tableMounted(){
        const hideElements = () => {
          $('.dataTables_info, .dataTables_length').hide();
          $('#layer_attribute_table_previous, #layer_attribute_table_next').hide();
          $('.dataTables_filter').css('float', 'right');
          $('.dataTables_paginate').css('margin', '0');
        };
        await this.$nextTick();
        this.first = false;
        dataTable = this.state.pagination ? $('#layer_attribute_table').DataTable({
          "lengthMenu": this.state.pageLengths,
          "scrollX": true,
          "scrollCollapse": true,
          "order": [this.state.formStructure ? 1 : 0, 'asc'],
          "columnDefs": [
            this.state.formStructure ? { "orderable": false, "targets": 0 }: null
          ],
          "ajax": debounce((data, callback) => {
            //remove listeners
            const trDomeElements = $('#layer_attribute_table tr');
            trDomeElements.each(element => {
              $(element).off('click');
              $(element).off('mouseover');
            });
            this.$options.service.getData(data)
              .then( async serverData => {
                callback(serverData);
                await this.$nextTick();
                this.createdContentBody();
                this.isMobile() && hideElements();
              })
              .catch((error) => {
                console.log(error)
              })
          }, 800),
          "serverSide": true,
          "processing": true,
          "deferLoading": this.state.allfeatures
        }) : $('#layer_attribute_table').DataTable({
          "lengthMenu": this.state.pageLengths,
          "scrollX": true,
          "scrollCollapse": true,
          "order": [ this.state.formStructure ? 1 : 0, 'asc' ],
          "columnDefs": [
            this.state.formStructure ? {
            "orderable": false, "targets": 0
          }: null
          ],
        });
        this.isMobile() && hideElements();
      }
    },
    created() {},
    mounted() {
      this.setContentKey = GUI.onafter('setContent', this.resize);
    },
    beforeDestroy() {
      console.log(dataTable)
      GUI.un('setContent', this.setContentKey);
      dataTable.destroy();
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
