<!--
  @file
  @since v3.7
-->

<template>
  <div id="open_attribute_table" style="margin-top: 5px">
    <table
      v-if="hasHeaders()"
      ref="attribute_table"
      id="layer_attribute_table"
      class="table table-striped row-border compact nowrap"
      style="width:100%"
    >
      <thead>
        <tr>
          <th></th>
          <th v-if="index > 0" v-for="(header, index) in state.headers">
            <input
              type         = "text"
              style        = "height: 25px; min-width: 40px; padding: 2px;"
              class        = "form-control column-search"
              @keyup       = "changeColumn($event, index)"
              :placeholder = "header.name"/>
          </th>
        </tr>
        <tr>
          <th v-for="(header, index) in state.headers">
            <span v-if="index === 0">
              <input
                type      = "checkbox"
                id        = "attribute_table_select_all_rows"
                :checked  = "state.selectAll"
                class     = "magic-checkbox"
                :disabled = "state.nofilteredrow || state.features.length === 0">
              <label
                for   = "attribute_table_select_all_rows"
                style = "margin-bottom:0 !important;" @click.capture.stop.prevent="selectAllRow"
              >
                <span style="padding:5px"></span>
              </label>
            </span>
            <span v-else>{{ header.label }}</span>
          </th>
        </tr>
      </thead>

      <table-body
        :headers                  = "state.headers"
        :filter                   = state.tools.filter
        :features                 = "state.features"
        :addRemoveSelectedFeature = "addRemoveSelectedFeature"
        :zoomAndHighLightFeature  = "zoomAndHighLightFeature"
      />

    </table>
    <div v-else id="noheaders" v-t="'dataTable.no_data'" ></div>
  </div>
</template>

<script>
import TableBody from 'components/TableBody.vue';
import SelectRow from 'components/TableSelectRow.vue';
import G3wTableToolbar from 'components/TableToolbar.vue';
import Field from 'components/FieldG3W.vue';
import GUI from 'services/gui';
import { resizeMixin } from 'mixins';

const { debounce } = require('utils');

let dataTable;
let fieldsComponents = [];
let eventHandlers = {
  pagination: {},
  nopagination: {}
};

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
    getDataFromBBOX() {
      this.$options.service.getDataFromBBOX();
    },
    toggleFilterToken() {
      this.$options.service.toggleFilterToken();
    },
    clearAllSelection() {
      this.$options.service.clearLayerSelection();
    },
    switchSelection() {
      this.$options.service.switchSelection();
    },
    selectAllRow() {
      this.state.features.length && this.$options.service.selectAllFeatures();
    },
    _setLayout() {
      this.$options.service._setLayout();
    },
    async zoomAndHighLightFeature(feature, zoom=true) {
      if (feature.geometry) {
        this.$options.service.zoomAndHighLightFeature(feature, zoom);
      } else {
        await this.$options.service.zoomAndHighLightGeometryRelationFeatures(feature, zoom);
      }
    },
    addRemoveSelectedFeature(feature) {
      this.$options.service.addRemoveSelectedFeature(feature);
    },
    async reloadLayout() {
      await this.$nextTick();
      if (dataTable) {
        dataTable.columns.adjust();
      }
    },
    hasHeaders() {
      return !!this.state.headers.length;
    },
    createdContentBody() {
      fieldsComponents = fieldsComponents.filter(fieldComponent => {
        fieldComponent.$destroy();
        return false;
      });
      const trDomeElements = dataTable.rows().nodes();
      //trDomeElements
      trDomeElements.each((rowElement, index) => {
        $(rowElement).css('cursor', 'pointer');
        if (this.state.features.length) {
          const feature = this.state.features[index];
          const hasGeometry = !!feature.geometry;
          $(rowElement).addClass('feature_attribute');
          feature.selected && $(rowElement).addClass('selected');
          $(rowElement).on('click', () => {
            if (hasGeometry) {
              this.zoomAndHighLightFeature(feature);
            }
          });
          $(rowElement).on('mouseover', () => {
            if (hasGeometry) {
              this.zoomAndHighLightFeature(feature, false);
            }
          });
          $(rowElement)
            .children()
            .each((index, element) => {
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
        "searchable": false,
        "width": '1%'
      } ]
    };
    if (this.state.pagination) {
      //pagination
      dataTable = $(this.$refs.attribute_table).DataTable({
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
      this.$options.service.on('ajax-reload', dataTable.ajax.reload);
      this.changeColumn = debounce(async (event, index) => {
        dataTable
          .columns(index)
          .search(event.target.value.trim())
          .draw();
      });
    } else { // no pagination all data
      dataTable = $(this.$refs.attribute_table).DataTable({
        ...commonDataTableOptions,
        searchDelay: 600
      });
      const debounceSearch = debounce(() => {
        this.$options.service.setFilteredFeature(dataTable.rows( {search:'applied'} )[0])
      }, 600);
      eventHandlers.nopagination['search.dt'] = debounceSearch;
      dataTable.on('search.dt', debounceSearch);
      dataTable.on('length.dt', (evt, settings, length) => {
        this.$options.service.setAttributeTablePageLength(length)
      });
      this.changeColumn = debounce(async (event, index) => {
        dataTable.columns(index).search(event.target.value.trim()).draw();
        this.$options.service.setFilteredFeature(dataTable.rows( {search:'applied'})[0]);
      });
    }

    if (this.isMobile()) {
      hideElements();
    }

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

    this.$options.service.on('redraw', data => {
      dataTable.clear();
      dataTable.draw(false);
      setTimeout(() => {
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
};
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
