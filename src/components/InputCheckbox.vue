<!-- ORIGINAL SOURCE: -->
<!-- gui/inputs/checkbox/vue/checkbox.html@v3.4 -->
<!-- gui/inputs/checkbox/vue/checkbox.js@v3.4 -->

<template>
  <baseinput :state="state">
    <div v-disabled="!editable" style="height: 20px; margin-top:8px;" slot="body">
      <input
        @change="changeCheckBox"
        style="width:100%"
        :class="{'input-error-validation' : notvalid}"
        class="magic-checkbox"
        v-model="value"
        type="checkbox"
        :id="id">
      <label :for="id">{{ label }}</label>
    </div>
  </baseinput>
</template>

<script>
const Input = require('gui/inputs/input');
const widgetMixins = require('gui/inputs/widgetmixins');
const {getUniqueDomId} = require('core/utils/utils');

export default {
  mixins: [Input, widgetMixins],
  data() {
    return {
      value: null,
      label:null,
      id: getUniqueDomId() // new id
    }
  },
  methods: {
    setLabel(){
      // convert label
      this.label = this.service.convertCheckedToValue(this.value);
    },
    setValue() {
      this.value = this.service.convertValueToChecked();
    },
    changeCheckBox() {
      // convert label
      this.setLabel();
      this.widgetChanged();
    },
    stateValueChanged() {
      this.setValue();
      this.setLabel();
    }
  },
  created() {
    this.value = this.state.forceNull ? this.value : this.service.convertValueToChecked();
  },
  mounted() {
    if (!this.state.forceNull) {
      this.setLabel();
      this.change();
    }
  }
};
</script>