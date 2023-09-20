<!--
  @file
  
  ORIGINAL SOURCE: src/components/InputTable.vue@3.8

  @since 3.9.0
-->

<template>
  <g3w-field :state="state">

    <!--
      @example <g3w-field mode="input" _type="table" />
     -->
    <template #input-body="{ editable, notvalid }">

      <div
        v-disabled = "!editable"
        :class     = "{ 'input-error-validation' : notvalid }"
        style      = "max-width: 100%; min-width: 100%"
      >

        <!-- TABLE HEADER (ADD ROW) -->
        <div
          class = "input_table_header"
          style = "display: flex; justify-content: flex-end"
        >
          <span
            @click = "addRow"
            class  = "skin-color"
            :class = "g3wtemplate.font['plus']"
          ></span>
        </div>

        <!-- TABLE CONTENT -->
        <table class="table table-bordered">

          <!-- ORIGINAL SOURCE: src/components/InputTableHeader.vue@3.8 -->
          <thead>
            <tr>
              <th v-for="header in headers">{{ header}}</th>
              <th></th>
            </tr>
          </thead>

          <!-- ORIGINAL SOURCE: src/components/InputTableBody.vue@3.8 -->
          <tbody>
            <tr v-for="(row, index) in state.value" :key="index">
              <td v-for="(value, rowindex) in row">
                <input
                  :type   = "inpuType(columntypes[rowindex])"
                  v-model = "row[rowindex]"
                >
              </td>
              <td @click="deleteRow(index)">
                <span
                  style  = "color: red;"
                  :class = "g3wtemplate.font['trash']"
                ></span>
              </td>
            </tr>
          </tbody>

        </table>

      </div>

    </template>

  </g3w-field>
</template>

<script>
import G3WField from 'components/G3WField.vue';

console.assert(undefined !== G3WField, 'G3WField is undefined');

export default {

  /** @since 3.8.6 */
  // name: 'input-table',

  components: {
    'g3w-field': G3WField,
  },

  props: {
    state: {
      type: Object,
      required: true,
    },
  },

  computed: {

    headers() {
      return this.state.input.options.headers.map((header) => header.name);
    },

    columntypes() {
      return this.state.input.options.headers.map((header) => header.type);
    }

  },

  methods: {

    addRow() {
      this.state.value.push(new Array(this.headers.length))
    },

    /**
     * ORIGINAL SOURCE: src/components/InputTableBody.vue@3.8
     */
    deleteRow(index) {
      this.state.value.splice(index,1);
    },

    /**
     * ORIGINAL SOURCE: src/components/InputTableBody.vue@3.8
     * 
     * @since 3.9.0
     */
    inpuType(type) {
      return ('text' !== type ? 'number' : type);
    },

  },

};
</script>