<!--
  @file
  @since v3.7
-->

<template>
  <component
    :is      = "type"
    :feature = "feature"
    :state   = "state">
  </component>
</template>

<script>
import Fields, { FieldsService } from 'components/g3w-fields';

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
    this.type = FieldsService.getType(this.state);
  }
};
</script>