<!--
  @file
  @since v3.7
-->

<template>
  <div class = "field g3w-field">
    <div v-if = "state.showlabel" class = "field_label">{{ state.label }}</div>
    <div class = "field_value">
      <div>
        <component
          :feature = "feature"
          :value   = "state.value"
          :is      = "state.vueoptions.component"/>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "vuefield",
  props: {
    feature: {
      type: Object
    },
    state: {
      type:    Object,
      default: {
        value:      null,
        vueoptions: {
          component: {}
        }
      }
    }
  }
}
</script>