<!--
  @file
  @since v3.7
-->

<template>
  <thead>
    <tr>
      <th v-for = "header in headers">{{ header}}</th>
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