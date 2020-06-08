<template functional>
  <div id="offline" data-placement="right" v-if="!online" title="OFFLINE" class="skin-tooltip-right">
    <i :class="g3wtemplate.getFontClass('wifi')"></i>
  </div>
</template>

<script>
  export default {
    name: 'online-status',
    props: ['online'],
    mounted() {
      $('#offline').tooltip();
    }
  }

</script>

<style>

</style>
