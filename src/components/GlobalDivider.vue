<!--
  @file
  @since v3.7
-->

<template>
  <span class = "divider"></span>
</template>

<script>
  export default {
    name: "divider"
  }
</script>

<style scoped>
  .divider {
    display: block;
    position: relative;
    padding: 0;
    margin-bottom: 5px;
    height: 0;
    width: 100%;
    max-height: 0;
    font-size: 1px;
    line-height: 0;
    clear: both;
    border: none;
    border-bottom: 2px solid #eeeeee;
  }
</style>