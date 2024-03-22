<!--
  @file
  
  ORIGINAL SOURCE: src/components/InputRadio.vue@3.8

  @since 3.9.0
-->

<template>
  <g3w-field :state="state">

    <!--
      @example <g3w-field mode="input" _type="radio" />
     -->
    <template #input-body="{ tabIndex, editable, notvalid }">
      <div>
        <span
          v-for = "(value, index) in state.input.options.values"
          :key  = "value.key"
        >
          <input
            :id        = "ids[index]"
            :name      = "name"
            :value     = "value.value"
            style      = "width: 100%"
            :tabIndex  = "tabIndex"
            v-disabled = "!editable"
            :class     = "{ 'input-error-validation' : notvalid }"
            class      = "magic-radio"
            v-model    = "radio_value"
            type       = "radio">
          <label :for="ids[index]">{{ value.key }}</label>
        </span>
      </div>
    </template>

  </g3w-field>
</template>

<script>
import G3WField           from 'components/G3WField.vue';
import { getUniqueDomId } from 'utils/getUniqueDomId';

Object
    .entries({
      G3WField,
      getUniqueDomId,
    })
    .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

export default {

  /** @since 3.8.6 */
  // name: 'input-radio',

  components: {
    'g3w-field': G3WField,
  },

  data() {
    return {
      ids: [
        getUniqueDomId(),
        getUniqueDomId(),
      ],
      name: `name_${getUniqueDomId()}`,
      radio_value: this.state.value
    };
  },

  props: {
    state: {
      type: Object,
      required: true,
    },
  },

  watch: {

    'radio_value'() {
      this.state.value = this.radio_value;
      this.$parent.change()
    },

  },

};
</script>