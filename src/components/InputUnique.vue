<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state" v-disabled = "!editable">
    <select
      slot       = "body"
      :id        = "id"
      style      = "width:100%"
      :tabIndex  = "tabIndex"
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
import { selectMixin }    from 'mixins';
import { getUniqueDomId } from 'utils/getUniqueDomId';

const Input              = require('gui/inputs/input');

export default {

  /** @since 3.8.6 */
  name: "input-unique",

  mixins: [ Input, selectMixin ],
  data() {
    return { id : `unique_${getUniqueDomId()}`}
  },
  async mounted() {
    await this.$nextTick();
    this.select2 = $(`#${this.id}`).select2({
      dropdownParent: $('#g3w-view-content'),
      tags: this.state.input.options.editable,
      language: this.getLanguage()
    });
    if (null !== this.state.value) {
      this.select2.val(this.state.value).trigger('change');
    }
    this.select2.on('select2:select', async e => {
      const value = e.params.data.$value ? e.params.data.$value : e.params.data.id;
      this.state.value = 'null' === value ? null :
        //need to check if values are Number or string  and convert it to compare
        //@TODO need to find a better way to comprare input value (from input html element) value is set as string
        ['integer', 'float', 'bigint'].includes(this.state.type) ? Number(value) : value;
      //check if start value is changed
      this.changeSelect(this.state.value);
      await this.$nextTick();
    })
  },

};
</script>