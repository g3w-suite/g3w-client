<!--
  @file
  @since v3.7
-->

<template functional>
  <div id = "offline_notification" v-online:hide style = "color: #999">
    <i :class = "g3wtemplate.getFontClass('wifi')"></i>
    <div style = "font-weight: bold; font-size:0.4em">offline</div>
  </div>
</template>

<script>
  export default {
    name: 'online-notify',
  }
</script>