<!--
  @file
  @since v3.7
-->

<template>
  <div class = "field">
    <div
      v-if  = "state.label"
      class = "col-sm-6  field_label"
    >
      <slot name = "label">{{state.label}}</slot>
    </div>
    <div
      :class = "[state.label ? 'col-sm-6' : null ]"
      class  = "field_value">
      <slot name = "field">
        <span style = "word-wrap: break-word;" v-html = "state.value"></span>
      </slot>
    </div>
  </div>
</template>

<script>
export default {
  name: "field",
  props: ['state']
}
</script>

<style scoped>
  .field {
    background-color: transparent !important;
    padding-top: 3px;
    padding-bottom: 3px;
    display: flex;
    align-items: center;
  }
  .value {
    position: relative;
  }
  .field div {
    padding-left: 3px;
    padding-right: 3px;
  }

  .field_value {
    padding-left: 0 !important;
  }
</style>
