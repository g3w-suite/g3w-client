<!--
  @file
  @since v3.7
-->

<template>
  <div class = "field">
    <div
      v-if  = "state.showlabel"
      class = "field_label"
    >
      <slot name = "label">{{ state.label }}</slot>
    </div>
    <div class = "field_value">
      <slot name = "field">
        <span style = "word-wrap: break-word;" v-html = "state.value"></span>
      </slot>
    </div>
  </div>
</template>

<script>
export default {
  name: "field",
  props: {
    state: {
      required: true,
      type:     Object,
    }
  }
}
</script>

<style scoped>
  .field {
    background-color: transparent !important;
    padding-top: 3px;
    padding-bottom: 3px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
  }
  .value {
    position: relative;
  }
  .field div {
    padding-left: 3px;
  }
  .field_value button {
    margin-right: 5px; 
  }
  .field_value {
    padding-left: 0 !important;
    padding-right: 8px;
    text-align: right;
    margin-left: auto;
  }
</style>
