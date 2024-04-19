<!--
  @file
  @since v3.7
-->

<template>
  <div class="wrap-content-tab">
    <div class="col-sm-2 metadata-label" v-t="data.label"></div>
    <div v-if="'keywords' === fieldName " class="col-sm-10 value">
      {{ arrayToString }}
    </div>
    <div v-else-if="'wms_url' === fieldName " class="col-sm-10 value" style="margin-top:0">
      <span>{{ data.value }}</span>
    </div>
    <div v-else-if="!isArrayorObject(data.value)" class="col-sm-10 value" style="margin-top:0">
      <span v-html="data.value"></span>
    </div>
    <div v-else-if="'abstract' === fieldName " class="col-sm-10 value" style="margin-top:0">
      <span v-html="data.value"></span>
    </div>
    <div v-else class="col-sm-10 value" style="margin-top:0">
      <div v-for="(value, key) in data.value">
        <span>{{ value }}</span>
      </div>
    </div>
  </div>
</template>

<script>
  export default {

    /** @since 3.8.6 */
    name: "metadata-tab-content",

    props: {
      data:      {},
      fieldName: {}
    },
    computed: {
      arrayToString() {
        return this.data.value.join(', ')
      }
    },
    methods: {
      isArrayorObject(value) {
        return Array.isArray(value) || typeof value === 'object';
      }
    },
  }
</script>

<style scoped>
  .metadata-label {
    font-weight: bold;
    font-size: 1.1em;
  }
</style>