<!--
  @file
  @since v3.7
-->

<template>
  <tbody>
    <tr v-for="(row, index) in rows" :key="index">
      <td v-for="(value, rowindex) in row">
        <input :type="inpuType(columntypes[rowindex])" v-model="row[rowindex]">
      </td>
      <td @click="deleteRow(index)">
        <span style="color: red;" :class="g3wtemplate.font['trash']"></span>
      </td>
    </tr>
  </tbody>
</template>

<script>
const Validators = require('utils/validators');

export default {

  /** @since 3.8.6 */
  name: "input-table-row",

  props: {
    columntypes: {
      type: Array,
      required: true
    },
    rows: {
      type: Array,
      required: true
    }
  },

  computed: {},

  methods: {
    deleteRow(index) {
      this.rows.splice(index,1);
    },
    inpuType(type) {
      if (type !== 'text')
        return 'number';
      return type
    },
  }
};
</script>

<style scoped>

</style>
