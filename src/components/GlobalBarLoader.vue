<!--
  @file
  @since 3.9.0
-->

<template>
  <div
    v-if   = "loading"
    class  = "bar-loader"
    style  = "border: 0"
    :style = "{ backgroundColor: color }">
  </div>
</template>

<script>
  export default {
    name:  "bar-loader",
    props: {
      loading: {
        type:    Boolean | String,
        default: false,
      },
      color: {
        type:     String,
        default: '#FFFFFF'
      }
    }
  };
</script>
