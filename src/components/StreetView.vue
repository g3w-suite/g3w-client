<!-- ORIGINAL SOURCE: -->
<!-- gui/streetview/vue/streetview.html@v3.4 -->
<!-- gui/streetview/vue/streetview.js@v3.4 -->

<template>
  <div id="streetview"></div>
</template>

<script>
export default {
  data() {
    return {
      state: null
    }
  },
  mounted() {
    this.$nextTick(() => {
      const position = this.$options.service.getPosition();
      this.$options.service.postRender(position);
    });
  }
};
</script>