<template>
  <ul class="nav navbar-nav navbar-left">
    <li v-for="item in items" :is="item" :key="item.id"></li>
  </ul>
</template>

<script>
  import NavbarItemsService from 'services/navbaritems';

  export default {
    name: "NavbaritemLeft",
    data() {
      return {
        items: NavbarItemsService.state.items.right
      }
    }
  }
</script>