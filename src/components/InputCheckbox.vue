<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">
    <div v-disabled="!editable" style="height: 20px; margin-top:8px;" slot="body">
      <input
        @change   = "changeCheckBox"
        :tabIndex = "tabIndex"
        style     = "width: 100%"
        :class    = "{ 'input-error-validation' : notvalid }"
        class     = "magic-checkbox"
        v-model   = "value"
        type      = "checkbox"
        :id       = "id"
      >
      <label :for="id">{{ label }}</label>
    </div>
  </baseinput>
</template>

<script>
import { g3wInputMixin, widgetMixins } from 'mixins';

console.assert(undefined !== g3wInputMixin);

const { getUniqueDomId } = require('utils');

export default {

  /** @since 3.8.6 */
  name:'input-checkbox',

  mixins: [
    g3wInputMixin,
    widgetMixins
  ],

  data() {
    return {
      value: null,
      label: null,
      id: getUniqueDomId(),
    }
  },

  methods: {

    setLabel() {
      // convert label
      this.label = this.service.convertCheckedToValue(this.value);
    },

    setValue() {
      this.value = this.service.convertValueToChecked();
    },

    changeCheckBox() {
      this.setLabel();
      this.widgetChanged();
    },

    stateValueChanged() {
      this.setValue();
      this.setLabel();
    },

  },

  created() {
    this.value = this.state.forceNull
      ? this.value
      : this.service.convertValueToChecked();
  },

  mounted() {
    if (!this.state.forceNull) {
      this.setLabel();
    }
  },

};
</script>