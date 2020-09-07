<template>
  <div class="field" :style="{fontSize: isMobile() && '0.8em'}">
    <div v-if="state.label" class="col-sm-6  field_label">
      <slot name="label">{{state.label}}</slot>
    </div>
    <div :class="[state.label ? 'col-sm-6' : null ]" class="field_value">
      <slot name="field">
        <span style="word-wrap: break-word;">{{ state.value }}</span>
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
    padding-top: 5px;
    padding-bottom: 5px;
    display: flex;
    align-items: center;
  }
  .value {
    position: relative;
  }
  .field div {
    padding-left: 5px;
    padding-right: 5px;
  }

  .field_value {
    padding-left: 0 !important;
  }
</style>
