<!--
  @file
  @since 3.9.0
-->

<template>
  <div v-if="loading" class="bar-loader" :style="{ backgroundColor: (color || '#FFFFFF'), border:0 }"></div>
</template>

<script>
  export default {
    name: "bar-loader",
    props: [
      'loading',
      'color'
    ],
  };
</script>
