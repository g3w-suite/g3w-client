<!--
  @file
  @since v3.7
-->

<template functional>
  <div id="download_notification" v-download.show title="DOWNLOAD" class="skin-color">
    <bar-loader loading="true"/>
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
