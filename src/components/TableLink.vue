<!-- ORIGINAL SOURCE: -->
<!-- gui/table/vue/components/link.vue@v3.4 -->

<!-- TODO: check if "gui/table/vue/components/link.vue@v3.4" component is depreacated -->

<template>
  <a :href="href" target="_blank">
    <i :class="g3wtemplate.getFontClass('link')"></i>
  </a>
</template>

<script>
export default {
  name: "link",
  props: ['href']
};
</script>

<style scoped>

</style>