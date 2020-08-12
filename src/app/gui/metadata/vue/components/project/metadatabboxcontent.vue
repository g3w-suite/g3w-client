<template>
  <div>
    <div class="col-sm-3 metadata-label skin-color-dark" v-t="data.label"></div>
    <div class="col-sm-9 value" style="margin-top:0">
      <div v-for="(value, index) in data.value">
        <span class="bbox-labels">{{ bboxlabels[index] }}</span> {{ value }}
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    name: "metadatabbox",
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
