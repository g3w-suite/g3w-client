<template>
  <table :id="id" class="row-forminput-table table table-striped" :class="customClass" width="100%">
    <thead>
      <tr>
        <th v-if="table.formStructure" style="max-width: 30px !important; min-width: 30px !important; padding: 0 !important;"></th>
        <slot name="header"></slot>
      </tr>
    </thead>
    <tbody>
      <template v-for="(row, index) in table.rows">
        <tr :class="{'selected': rowFormStructure === row}" style="cursor: pointer" @click="toggleRow(index)" :selected="selectedRow === index">
          <td @click="showFormStructureRow($event, row)"  v-if="table.formStructure">
            <span style="max-width: 15px; width: 15px;" :current-tooltip="rowFormStructure === row ? 'sdk.tooltips.relations.form_to_row': 'sdk.tooltips.relations.row_to_form'"
              class="switch-row-form action-button row-form skin-color skin-tooltip-right" v-t-tooltip="rowFormStructure === row ? 'sdk.tooltips.relations.form_to_row': 'sdk.tooltips.relations.row_to_form'"
              data-placement="right" :class="[rowFormStructure === row ? g3wtemplate.getFontClass('minus') :  g3wtemplate.getFontClass('table')]"></span>
          </td>
          <template v-if="table.formStructure && rowFormStructure === row">
            <td :colspan="table.columns.length" class="row-wrap-tabs">
              <tabs :layerid="table.layerId" :feature="feature" :fields="fields" :tabs="table.formStructure"></tabs>
            </td>
          </template>
          <template v-else>
            <slot name="body" :row="row">
              <td v-for="value in row">
                <field :state="{value:value}"></field>
              </td>
            </slot>
          </template>
        </tr>
      </template>
    </tbody>
  </table>
</template>

<script>
  import Tabs from "gui/tabs/tabs.vue";
  const Field = require('gui/fields/g3w-field.vue');
  const {fieldsMixin} = require('gui/vue/vue.mixins');
  export default {
    name: "TableRowFormInput",
    components: {
      Tabs,
      Field
    },
    mixins: [fieldsMixin],
    props: {
      id: {
        type: String,
        default: '_unique_table_id'
      },
      customClass: {
        type: String,
        default: ''
      },
      table: {
        type: Object,
        default: {
          headers:[],
          rows: [],
          columns: [],
          formStructure: null
        }
      },
      selectRow: {
        type: Boolean,
        default: false
      }
    },
    data(){
      return {
        rowFormStructure: null,
        feature: null,
        fields: null,
        selectedRow: null
      }
    },
    methods: {
      toggleRow(index) {
        console.log(index)
        this.selectedRow = this.selectedRow === index ? null : index;
      },
      async showFormStructureRow(event, row){
        this.rowFormStructure = this.rowFormStructure === row ? null : row;
        this.feature = this.getTabFeature(row);
        this.fields = this.getRowFields(row);
        this.$emit('show-hide-form-structure');
        await this.$nextTick();
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
      }
    },
    created(){},
    async mounted(){
      this.table.formStructure  && $('.switch-row-form').tooltip();
    }
  }
</script>

<style scoped>

</style>