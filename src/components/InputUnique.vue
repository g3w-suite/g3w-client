<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">
    <select
      slot       = "body"
      :id        = "id"
      style      = "width:100%"
      :tabIndex  = "tabIndex"
      v-disabled = "!editable"
      class      = "form-control"
    >
      <option value = "null"></option>
      <option
        v-for  = "value in state.input.options.values"
        :key   = "value"
        :value = "getValue(value)" >{{ getValue(value) }}</option>
    </select>
  </baseinput>
</template>

<script>
import { selectMixin } from 'mixins';

const Input              = require('gui/inputs/input');
const { getUniqueDomId } = require('utils');

export default {

  /** @since 3.8.6 */
  name: "input-unique",

  mixins: [Input, selectMixin],
  data() {
    const id = `unique_${getUniqueDomId()}`;
    return {id}
  },
  watch: {
    async 'state.input.options.values'(values) {
      this.state.value = this.state.value
        //need to check if values are Number or string  and convert it to compare
        //@TODO need to find a better way to comprare input value (from input html element) value is set as string
        ? ['integer', 'float', 'bigint'].includes(this.state.type) ? Number(this.state.value) : this.state.value
        : null;
      //check if the value is already added to value array
      if (null !== this.state.value && !values.includes(this.state.value)) {
        this.service.addValueToValues(this.state.value);
      }
      await this.$nextTick();
      if (this.state.value) {
        this.select2.val(this.state.value).trigger('change');
      }
    }
  },
  async mounted() {
    await this.$nextTick();
    if (this.state.input.options.editable) {
      this.select2 = $(`#${this.id}`).select2({
        dropdownParent: $('#g3w-view-content'),
        tags: true,
        language: this.getLanguage()
      });
      this.select2.val(this.state.value).trigger('change');
      this.select2.on('select2:select', event => {
        const value = event.params.data.$value ? event.params.data.$value : event.params.data.id;
        this.changeSelect(value);
      })
    }
  }
};
</script>