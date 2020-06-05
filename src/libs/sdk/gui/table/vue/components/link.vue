<template>
  <a :href="href" target="_blank">
    <i :class="g3wtemplate.getFontClass('link')"></i>
  </a>
</template>

<script>
  export default {
    name: "link",
    props: ['href']
  }
</script>

<style scoped>

</style>
