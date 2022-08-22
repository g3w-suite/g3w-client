<!-- ORIGINAL SOURCE: -->
<!-- gui/inputs/table/vue/components/input-table-header.vue@v3.4 -->

<template>
  <thead>
    <tr>
      <th v-for="header in headers">{{ header}}</th>
      <th></th>
    </tr>
  </thead>
</template>

<script>
export default {
  name: "input-table-header",
  props: {
    headers: {
      type: Array,
      required: true
    }
  }
};
</script>

<style scoped>

</style>
