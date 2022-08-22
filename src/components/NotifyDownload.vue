<!-- ORIGINAL SOURCE: -->
<!-- gui/notifications/download/vue/download.vue@v3.4 -->

<template functional>
  <div id="download_notification" v-download.show title="DOWNLOAD" class="skin-color">
    <bar-loader loading="true"></bar-loader>
    <i style="padding:3px" :class="g3wtemplate.getFontClass('download')"></i>
  </div>
</template>

<script>
  export default {
    name: 'download-notify',
  }

</script>

<style>

</style>
