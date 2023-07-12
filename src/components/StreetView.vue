<!--
  @file
  @since v3.7
-->

<template>
  <div id="streetview">
    <div id="streetview-error-key" v-if="$options.keyError">
      <span class="skin-color"> {{ $options.keyError }}</span>
    </div>
  </div>
</template>

<script>
export default {
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