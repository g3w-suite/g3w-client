<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">
    <div
      slot       = "body"
      v-disabled = "!editable"
      :class     = "{'input-error-validation' : notvalid}"
      style      = "max-width: 100%; min-width: 100%"
    >
      <div class = "input_table_header" style = "display: flex; justify-content: flex-end" >
        <span @click = "addRow" class = "skin-color" :class = "g3wtemplate.font['plus']"></span>
      </div>
      <table class = "table table-bordered">
        <input-table-header :headers = "headers"/>
        <input-table-body :columntypes = "columntypes" :rows = "state.value"/>
      </table>
    </div>
  </baseinput>
</template>

<script>
  import InputTableHeader from 'components/InputTableHeader.vue';
  import InputTableBody   from 'components/InputTableBody.vue';

  const Input = require('gui/inputs/input');

  export default {

    /** @since 3.8.6 */
    name: 'input-table',

    mixins: [Input],
    components: {
      InputTableHeader,
      InputTableBody
    },
    computed: {
      headers() {
        return this.state.input.options.headers.map((header) => {
          return header.name;
        });
      },
      columntypes() {
        return this.state.input.options.headers.map((header) => {
          return header.type;
        })
      }
    },
    methods: {
      addRow() {
        this.state.value.push(new Array(this.headers.length))
      },
      deleteRow(index) {}
    }
  };
</script>