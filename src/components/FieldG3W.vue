<!--
  @file
  @since v3.7
-->

<template>
  <component
    :is      = "type"
    :feature = "feature"
    :state   = "state"/>
</template>

<script>
import {Fields, fieldsService } from "g3w-field";

export default {
  name: "g3w-field",
  props: {
    state: {
      required: true
    },
    feature: {
      type: Object
    }
  },
  components: {
    ...Fields
  },
  created() {
    this.type = fieldsService.getType(this.state)
  }
};
</script>