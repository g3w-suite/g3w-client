<!--
  @file
  @since 3.9.0
-->
<template>
  <li class="nominatim-noresult" v-t="noresults"></li>
</template>

<script>
export default {

  // functional: true,

  props: {
    noresults: {
      type: String,
      required: true
    }
  },

};
</script>