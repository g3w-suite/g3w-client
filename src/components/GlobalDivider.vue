<!--
  @file
  @since v3.7

  @deprecated since 3.9.0. Use `class="divider"` instead. Will be removed in 4.1.x
-->

<template>
  <span class="divider"></span>
</template>

<script>
  const deprecate = require('util-deprecate');
  export default {
    name: "divider",
    created: deprecate(function foo() {}, '<dividier> tag is deprecated. Use `class="divider"` instead.'),
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