<!--
  @file
  @since v3.7
-->

<template>
  <div class = "wrap-content-tab">
    <div class = "col-sm-2 metadata-label" v-t = "data.label"></div>
      <div class = "col-sm-10 value" style = "margin-top:0">
        <div v-for = "(value, index) in data.value">
          <span class = "bbox-labels">{{ bboxlabels[index] }}</span> {{ value }}
        </div>
    </div>
  </div>
</template>

<script>
  export default {

    /** @since 3.8.6 */
    name: "metadata-bbox",

    props: {
      data: {}
    },
    data() {
      return {
        bboxlabels: ['MINX', 'MINY', 'MAXX', 'MAXY']
      }
    }
  }
</script>

<style scoped>
  .metadata-label {
    font-weight: bold;
    font-size: 1.1em;
  }
  .bbox-labels {
    font-weight: bold;
  }
</style>