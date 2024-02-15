<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">
    <select
      :id          = "id"
      slot         = "body"
      style        = "width: 100%"
      :tabIndex    = "tabIndex"
      v-disabled   = "!editable"
      class        = "form-control"
    >
      <option value="null"></option>
      <option
        v-for  = "value in state.input.options.values"
        :key   = "value"
        :value = "getValue(value)"
      >{{ getValue(value) }}</option>
    </select>
  </baseinput>
</template>

<script>
import { g3wInputMixin, selectMixin } from 'mixins';

const { getUniqueDomId } = require('utils');

export default {

  /** @since 3.8.6 */
  name: "input-unique",

  mixins: [
    g3wInputMixin,
    selectMixin
  ],

  data() {
    return { id: `unique_${getUniqueDomId()}` };
  },

  watch: {

    async 'state.input.options.values'(values) {

      this.state.value = this.state.value
        ? this.state.value
        : null;

      if (null !== this.state.value && -1 === values.indexOf(this.state.value)) {
        this.service.addValueToValues(this.state.value);
      }

      await this.$nextTick();

      if (this.state.value) {
        this.select2.val(this.state.value).trigger('change');
      }

    },

  },

  async mounted() {
    await this.$nextTick();
    if (!this.state.input.options.editable) {
      return;
    }
    this.select2 = $(`#${this.id}`).select2({ dropdownParent: $('#g3w-view-content'), tags: true, language: this.getLanguage() });
    this.select2.val(this.state.value).trigger('change');
    this.select2.on('select2:select', e => { this.changeSelect(e.params.data.$value ? e.params.data.$value : e.params.data.id); })
  },

};
</script>