<template>
  <tbody id="table_body_attributes">
    <tr role="row" class="feature_attribute"
        style="cursor: pointer"
        v-for="(feature, index) in features" :key="feature.id"
        @mouseover="zoomAndHighLightFeature(feature, false)"
        @click="zoomAndHighLightFeature(feature, index)"
        :selected="selectedRow === index"
        :class="[index %2 == 1 ? 'odd' : 'pair', {geometry: !!feature.geometry}, {'selected': feature.selected}]">
      <td v-for="(header, hindex) in headers" :tab-index="1">
        <select-row @selected="addRemoveSelectedFeature" :feature="feature" v-if="hindex===0"></select-row>
        <field v-else :state="{value: feature.attributes[header.name]}"></field>
      </td>
    </tr>
  </tbody>
</template>

<script>
  import SelectRow from './selectrow.vue'
  const Field = require('gui/fields/g3w-field.vue');
  export default {
    name: "table-body",
    props: {
      headers: {
        required: true,
        type: Array
      },
      features: {
        required: true,
        type: Array
      },
      zoomAndHighLightFeature: {
        type: Function
      },
      addRemoveSelectedFeature: {
        type: Function
      }
    },
    data() {
      return {
        selectedRow: null
      }
    },
    components: {
      Field,
      SelectRow
    }
  }
</script>

<style scoped>

</style>
