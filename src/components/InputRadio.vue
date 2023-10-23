<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">
    <div slot="body">
      <span v-for="(value, index) in state.input.options.values" :key="value.key">
        <input
          :id="ids[index]"
          :name="name"
          :value="value.value"
          style="width:100%"
          :tabIndex="tabIndex"
          v-disabled="!editable"
          :class="{'input-error-validation' : notvalid}"
          class="magic-radio"
          v-model="radio_value"
          type="radio">
        <label :for="ids[index]">{{ value.key }}</label>
      </span>
    </div>
  </baseinput>
</template>

<script>
const Input = require('gui/inputs/input');
const { getUniqueDomId } = require('utils');

export default {

  /** @since 3.8.6 */
  name: 'input-radio',

  mixins: [Input],
  data() {
    return {
      ids: [getUniqueDomId(),getUniqueDomId()],
      name: `name_${getUniqueDomId()}`,
      radio_value: this.state.value
    }
  },
  watch: {
    'radio_value'() {
      this.state.value = this.radio_value;
      this.change()
    }
  },
};
</script>