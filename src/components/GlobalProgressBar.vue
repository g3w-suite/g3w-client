<!--
  @file
  @since 3.9.0
-->

<template>
  <div
    v-if  = "(null !== progress && undefined !== progress)"
    style = "margin: 5px 0 5px 0; width: 100%; background-color: #FFFFFF; border: 0; border-radius: 3px;"
  >
    <div
      class  = "skin-background-color"
      style  = "display: flex; justify-content: center; font-weight: bold;"
      :style = "{ width: (progress < 10 ? 10 : progress) }"
    >
      <span>{{ progress }}</span>
    </div>
  </div>
</template>

<script>
  export default {
    name: "progressbar",
    props: ['progress'],
  };
</script>
