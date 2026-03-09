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
        :class    = "{'input-error-validation' : notvalid}"
        v-model   = "value"
        type      = "checkbox"
        :id       = "id"
      />
      <label :for = "id">{{ label }}</label>
    </div>
  </baseinput>
</template>

<script>
import { getUniqueDomId } from 'utils/getUniqueDomId';
import Input              from 'components/g3w-input';

export default {

  /** @since 3.8.6 */
  name:'input-checkbox',

  mixins: [Input],

  data() {
    return {
      value: null,
      label: null,
      id:    getUniqueDomId(), // new id
    }
  },

  methods: {

    /**
     * @see https://github.com/g3w-suite/g3w-admin/issues/958
     * 
     * @since 3.11.0
     */
    getValuesItem(checked) {
      return (this.state.input.options.values.find(v => checked === v.checked) || {});
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
      let option = this.state.input.options.values.find(v => this.state.value == v.value);
      if (undefined === option) {
        option = this.state.input.options.values.find(v => false === v.checked);
        this.state.value = option.value;
      }
      return option.checked;
    },

    changeCheckBox() {
      const { value, label } = this.getValuesItem(this.value);
      this.label             = label ?? value;
      this.state.value       = value;
      this.change();
    },

  },

  mounted() {
    //@since 4.0.6 Check after created (set default value eventualy). Need to convert it to string
    const { checked, label, value } = this.state.input.options.values.find(v => `${this.state.value}` === `${v.value}`) ?? { };
    this.value             = checked ?? null;
    this.label             = label ?? value ?? null;
  },

};
</script>