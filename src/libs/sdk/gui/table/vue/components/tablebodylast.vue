<template>
  <tbody id="table_body_attributes">
    <table-body-row
      :feature="feature"
      :headers="headers"
      :zoom-and-high-light-selected-feature="zoomAndHighLightSelectedFeature"
      :index="index"
      v-for="(feature, index) in features">
    </table-body-row>
  </tbody>
</template>

<script>
  import tableBodyRow from "./tablebodyrow.vue";
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
      hasGeometry: {
        type: Boolean
      }
    },
    components: {
      tableBodyRow
    },
    beforeDestroy() {
      console.log('destroy')
    }
  }
</script>

<style scoped>

</style>
