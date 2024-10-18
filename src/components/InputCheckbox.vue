<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state = "state">
    <div v-disabled = "!editable" style = "height: 20px; margin-top:8px;" slot = "body">
      <input
        @change   = "changeCheckBox"
        :tabIndex = "tabIndex"
        style     = "width:100%"
        :class    = "{'input-error-validation' : notvalid}"
        class     = "magic-checkbox"
        v-model   = "value"
        type      = "checkbox"
        :id       = "id">
      <label :for = "id">{{ label }}</label>
    </div>
  </baseinput>
</template>

<script>
import { widgetMixins }   from 'mixins';
import { getUniqueDomId } from 'utils/getUniqueDomId';

const Input              = require('gui/inputs/input');

export default {

  /** @since 3.8.6 */
  name:'input-checkbox',

  mixins: [Input, widgetMixins],
  data() {
    return {
      value: null,
      label: null,
      id:    getUniqueDomId() // new id
    }
  },
  methods: {
    /**
     * @see https://github.com/g3w-suite/g3w-admin/issues/958
     * 
     * @since 3.11.0
     */
    getValuesItem(checked = false) {
      return (this.service.state.input.options.values.find(v => !!checked === v.checked) || {});
    },
    changeCheckBox() {
      const { value, label } = this.getValuesItem(this.value);
      this.label             = label;
      this.state.value       = value;
      this.widgetChanged();
    },
    stateValueChanged() {
      this.value             = this.service.convertValueToChecked();
      const { value, label } = this.getValuesItem(this.value);
      this.label             = label;
      this.state.value       = value;
    }
  },
  mounted() {
    //Need to set label and value
    this.stateValueChanged();
  }
};
</script>