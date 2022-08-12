<!-- ORIGINAL SOURCE: -->
<!-- gui/navbar/navbarrightitems.html@v3.4 -->
<!-- gui/navbar/navbaritems.js@v3.4 -->

<template>
  <ul class="nav navbar-nav navbar-right">
    <li v-for="item in items" :is="item" :key="item.id"></li>
  </ul>
</template>

<script>
  import NavbarItemsService from 'services/navbaritems';

  export default {
    name: "NavbaritemRight",
    data() {
      return {
        items: NavbarItemsService.state.items.right
      }
    }
  }
</script>

<style scoped>

</style>