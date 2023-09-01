<!--
  @file
  @since v3.7
-->

<template functional>
  <span
    class       = "circle-icon skin-background-color lighten"
    @click.stop = "fnc"
    :id         = "id"
    :title      = "title || id"
  >
    <i :class="fontClass"></i>
  </span>

</template>

<script>
  export default {
    name: "addon",

    props: {

      id: {
        type: String,
        required: true
      },

      title: {
        type: String,
        required: false
      },

      fontClass: {
        type: String,
        required: true
      },

      fnc: {
        type: Function,
        required: true
      },

    },

  };
</script>

<style scoped>
  .circle-icon {
    padding:8px;
    border-radius: 50%;
    -webkit-box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    -moz-box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

</style>
