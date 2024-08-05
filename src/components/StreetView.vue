<!--
  @file
  @since v3.7
-->

<template>
  <div id = "streetview">
    <div v-if = "$options.keyError" id = "streetview-error-key">
      <span class = "skin-color">{{ $options.keyError }}</span>
    </div>
  </div>
</template>

<script>
export default {

  /** @since 3.8.6 */
  name: 'streetview',

  data() {
    return {
      state: null
    }
  }
};
</script>

<style scoped>
  #streetview-error-key {
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: bold;
    height: 100%;
    padding: 10px;
    background-color: #FFFFFF;
  }
</style>