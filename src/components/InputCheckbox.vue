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
import { getUniqueDomId } from 'utils/getUniqueDomId';

const Input              = require('gui/inputs/input');

export default {

  /** @since 3.8.6 */
  name:'input-checkbox',

  mixins: [Input],

  data() {
    return {
      value:   null,
      label:   null,
      id:      getUniqueDomId(), // new id
      /** @since 3.11.0 */
      changed: false,
    }
  },

  watch: {

    /**
     * ORIGINAL SOURCE: src/mixins/widget.js@3.10.4
     * 
     * @since 3.11.0
     */
    'state.value'(value) {
      if (this.changed) {
        this.changed = false
      } else {
        this.stateValueChanged(value);
      }
    },

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

    /**
     * ORIGINAL SOURCE: src/mixins/widget.js@3.10.4
     *
     * @since 3.11.0
     */
    convertValueToChecked() {
      if ([null, undefined].includes(this.service.state.value)) {
        return false;
      }
      let option = this.service.state.input.options.values.find(v => this.service.state.value == v.value);
      if (undefined === option) {
        option = this.service.state.input.options.values.find(v => false === v.checked);
        this.service.state.value = option.value;
      }
      return option.checked;
    },

    changeCheckBox() {
      const { value, label } = this.getValuesItem(this.value);
      this.label             = label;
      this.state.value       = value;
      this.changed = true;
      this.change();
    },

    stateValueChanged() {
      this.value             = this.convertValueToChecked();
      const { value, label } = this.getValuesItem(this.value);
      this.label             = label;
      this.state.value       = value;
    },

  },

  mounted() {
    //Need to set label and value
    this.stateValueChanged();
  },

};
</script>