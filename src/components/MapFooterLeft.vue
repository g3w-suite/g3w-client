<!-- 
  @since v3.7.0
-->

<template>
  <div
    id    = "map_footer_left"
    style = "display: flex;"
  >
    <a
      href   = "https://g3wsuite.it/"
      style  = "margin-left: 5px; align-self: center;"
      target = "_blank"
      :title = "version"
    >
      <img
        height = "15"
        src    = "/static/client/images/g3wsuite_logo.png"
        alt    = "">
    </a>
  </div>
</template>

<script>
  export default {
    name: 'Mapfooter',
    computed: {
      version() {
        return 'Powered by G3W-SUITE ' + initConfig.version;
      }
    }
  };
</script>
