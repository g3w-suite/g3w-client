<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state = "state">
    <div slot = "body">
      <span v-for = "(value, index) in state.input.options.values" :key = "value.key || value.value">
        <input
          :id        = "ids[index]"
          :name      = "name"
          :value     = "value.value"
          :tabIndex  = "tabIndex"
          v-disabled = "!editable"
          :class     = "{'input-error-validation' : notvalid}"
          v-model    = "radio_value"
          type       = "radio"
        />
        <label :for = "ids[index]" style = "padding: 5px;" >{{ value.key || value.value }}</label>
      </span>
    </div>
  </baseinput>
</template>

<script>
  import { getUniqueDomId } from 'utils/getUniqueDomId';
  import Input              from 'components/g3w-input';

  export default {

    /** @since 3.8.6 */
    name: 'input-radio',

    mixins: [Input],
    data() {
      return {
        ids:         [getUniqueDomId(),getUniqueDomId()],
        name:        `name_${getUniqueDomId()}`,
        radio_value: this.state.value
      }
    },
    watch: {
      'radio_value'() {
        this.state.value = this.radio_value;
        this.change();
      }
    },
  };
</script>