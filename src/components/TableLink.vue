<!--
  @file
  @since v3.7

  @TODO check if "gui/table/vue/components/link.vue@v3.4" component is depreacated
-->

<template>
  <a :href="href" target="_blank">
    <i :class="g3wtemplate.getFontClass('link')"></i>
  </a>
</template>

<script>
export default {

  /** @since 3.8.6 */
  name: "table-link",

  props: ['href']
};
</script>