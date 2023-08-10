<!--
  @file
  @since v3.7
-->

<template>
  <component
    :is      = "type"
    :feature = "feature"
    :state   = "state"
  />
</template>

<script>
import { fieldsMixin } from 'mixins';

console.assert(undefined !== fieldsMixin, 'fieldsMixin is undefined');

export default {

  name: "g3w-field",

  props: {

    state: {
      required: true
    },

    feature: {
      type: Object
    },

  },

  components: fieldsMixin.methods.getFieldService().getFields(),

  created() {
    this.type = fieldsMixin.methods.getFieldService().getType(this.state);
  },

};
</script>