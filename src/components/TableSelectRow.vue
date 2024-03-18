<!--
  @file
  @since v3.7
-->

<template>
  <span>
    <input
      type     = "checkbox"
      :id      = "id"
      :checked = "feature.selected"
      class    = "magic-checkbox"
    >
    <label
      :for                        = "id"
      @click.capture.stop.prevent = "select"
    >
      <span></span>
    </label>
  </span>
</template>

<script>
const { getUniqueDomId } = require('utils');

export default {
  name: "select-row",
  props: {
    feature: {
      required: true
    }
  },
  data() {
    return {
      id: getUniqueDomId()
    }
  },
  methods: {
    select() {
      this.$emit('selected', this.feature);
    }
  },
  destroyed() {
    this.$off('selected')
  }
}
</script>