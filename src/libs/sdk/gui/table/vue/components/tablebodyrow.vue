<template>
  <tr role="row" class="feature_attribute" :id="'open_table_row_' + index"
      @click="zoomAndHighLightSelectedFeature(feature); toggleRow(index)"
      :selected="selectedRow === index"
      :class="[index %2 === 1 ? 'even' : 'odd', {geometry: hasGeometry}]">
    <td v-for="(header, idx) in headers">
      <field :state="{value: feature.attributes[header.name]}"></field>
    </td>
  </tr>
</template>

<script>
  const Field = require('gui/fields/g3w-field.vue');
  export default {
    name: "table-body-row",
    props: {
      index: {
        type: Number
      },
      feature: {
        required:true
      },
      headers: {
        required: true,
        type: Array
      },
      zoomAndHighLightSelectedFeature: {
        type: Function,
        required: true
      }
    },
    components: {
      Field
    },
    data() {
      return {
        selectedRow: null
      }
    },
    methods: {
      toggleRow(index) {
        this.selectedRow = this.selectedRow === index ? null : index;
      }
    }
  }
</script>

<style scoped>
  .geometry {
    cursor: pointer
  }
</style>
