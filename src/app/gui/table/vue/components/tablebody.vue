<template>
  <tbody id="table_body_attributes">
    <tr role="row" class="feature_attribute"
        style="cursor: pointer"
        v-for="(feature, index) in features" :key="feature.id"
        @mouseover="zoomAndHighLightSelectedFeature(feature, false)"
        @click="[zoomAndHighLightSelectedFeature(feature, index), toggleRow(index)]"
        :selected="selectedRow === index"
        :class="[index %2 == 1 ? 'odd' : 'pair', {geometry: feature.geometry}]">
      <td v-for="header in headers" :tab-index="1">
        <field :state="{value: feature.attributes[header.name]}"></field>
      </td>
    </tr>
  </tbody>
</template>

<script>
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
      zoomAndHighLightSelectedFeature: {
        type: Function
      },
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
    },
    components: {
      Field
    }
  }
</script>

<style scoped>

</style>
