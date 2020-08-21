<template>
  <div id="open_attribute_table">
    <table v-if="hasHeaders()"  id="layer_attribute_table" class="table table-striped display compact nowrap" style="width:100%">
      <thead>
        <tr>
          <th v-for="header in state.headers">{{ header.label }}</th>
        </tr>
      </thead>
      <table-body :headers="state.headers" :features="state.features" :zoomAndHighLightSelectedFeature="zoomAndHighLightSelectedFeature"></table-body>
    </table>
    <div id="noheaders" v-t="'dataTable.no_data'" v-else>
    </div>
  </div>
</template>

<script>
  import TableBody from "./components/tablebody.vue";
  const Field = require('gui/fields/g3w-field.vue');
  const debounce = require('core/utils/utils').debounce;
  let dataTable;
  let fieldsComponents = [];
  export default {
    name: "G3WTable",
    data: function() {
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
      _setLayout: function() {
        this.$options.service._setLayout();
      },
      zoomAndHighLightSelectedFeature: function(feature, zoom=true) {
        feature.geometry && this.$options.service.zoomAndHighLightSelectedFeature(feature, zoom);
      },
      reloadLayout() {
        this.$nextTick(() => {
          dataTable.columns.adjust();
        });
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
          if (feature.geometry) {
            $(element).on('click', ()=> {
              if ($(element).hasClass( "selected" ))
                $(element).removeClass( "selected" );
              else {
                $('#layer_attribute_table tbody tr').removeClass('selected');
                $(element).addClass( "selected" );
                this.zoomAndHighLightSelectedFeature(feature);
              }
            });
            $(element).on('mouseover', () => {
              this.zoomAndHighLightSelectedFeature(feature, false);
            });
          }
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
        setTimeout(()=> {
          this.reloadLayout()
        }, 0)
      }
    },
    created() {},
    mounted: function() {
      const hideElements = () => {
        $('.dataTables_info, .dataTables_length').hide();
        $('#layer_attribute_table_previous, #layer_attribute_table_next').hide();
        $('.dataTables_filter').css('float', 'right');
        $('.dataTables_paginate').css('margin', '0');
      };
      this.$nextTick(() => {
        this.first = false;
        if (this.state.pagination) {
          //pagination
          dataTable = $('#open_attribute_table table').DataTable({
            "lengthMenu": this.state.pageLengths,
            "scrollX": true,
            "scrollCollapse": true,
            "order": [ 0, 'asc' ],
            "columns": this.state.headers,
            "ajax": debounce((data, callback) => {
              //remove listeners
              const trDomeElements = $('#open_attribute_table table tr');
              trDomeElements.each(element => {
                $(element).off('click');
                $(element).off('mouseover');
              });
              this.$options.service.getData(data)
                .then((serverData) => {
                  callback(serverData);
                  this.$nextTick(() => {
                    this.createdContentBody();
                    if (this.isMobile()) {
                      hideElements();
                    }
                  })
                })
                .catch((error) => {
                  console.log(error)
                })
            }, 800),
            "serverSide": true,
            "processing": true,
            //"responsive": true,
            "deferLoading": this.state.allfeatures
          });
        } else {
          // no pagination all data
          dataTable = $('#open_attribute_table table').DataTable({
            "lengthMenu": this.state.pageLengths,
            "scrollX": true,
            "scrollCollapse": true,
            "order": [ 0, 'asc' ],
            //"responsive": true,
          });
        }
        if (this.isMobile()) {
          hideElements();
        }
        const tableHeight = $(".content").height();
        const tableHeaderHeight = $('#open_attribute_table  div.dataTables_scrollHeadInner').height();
        $('#open_attribute_table  div.dataTables_scrollBody').height(tableHeight - tableHeaderHeight - 130);
      });
    },
    beforeDestroy() {
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
