<!--
  @file
  @since v3.7

  @version 2.0 ADD SOURCE FROM: src/mixins/widget.js@3.8
-->

<template>
  <g3w-input :state="state">
    <template #body="{ tabIndex, editable, notvalid }">
      <div
        v-disabled  = "!editable"
        style       ="height: 20px; margin-top:8px;"
      >
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
    </template>
  </g3w-input>
</template>

<script>

const { getUniqueDomId } = require('core/utils/utils');

export default {

  /** @since 3.8.6 */
  name:'input-checkbox',

  props: {
    state: {
      type: Object,
      required: true,
    },
  },

  data() {
    return {
      value:   null,
      label:   null,
      changed: false,
      id:      getUniqueDomId(),
    }
  },

  watch: {

    /**
     * ORIGINAL SOURCE: src/mixins/widget.js@3.8
     */
    'state.value'(value) {
      if (this.changed) {
        this.changed = false;
      } else {
        this.stateValueChanged(value);
      } 
    },

  },

  methods: {

    setLabel() {
      this.label = this.$parent.getInputService().convertCheckedToValue(this.value); // convert label.
    },

    setValue() {
      this.value = this.$parent.getInputService().convertValueToChecked();
    },

    changeCheckBox() {
      this.setLabel();
      this.widgetChanged();
    },

    stateValueChanged() {
      this.setValue();
      this.setLabel();
    },

    /**
     * ORIGINAL SOURCE: src/mixins/widget.js@3.8
     */
    widgetChanged() {
      this.changed = true;
      this.$parent.change();
    },

  },

  created() {
    this.value = this.state.forceNull
      ? this.value
      : this.$parent.getInputService().convertValueToChecked();
  },

  mounted() {
    if (!this.state.forceNull) {
      this.setLabel();
    }
  },

};
</script>