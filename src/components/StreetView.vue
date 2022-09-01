<!-- ORIGINAL SOURCE: -->
<!-- gui/streetview/vue/streetview.html@v3.4 -->
<!-- gui/streetview/vue/streetview.js@v3.4 -->

<template>
  <div id="streetview">
    <div id="streetview-error-key" v-if="$options.service.errorKey">
      <span class="skin-color"> {{ $options.service.errorKey }}</span>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      state: null
    }
  },
  async mounted() {
    await this.$nextTick();
    const position = this.$options.service.getPosition();
    this.$options.service.postRender(position);
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