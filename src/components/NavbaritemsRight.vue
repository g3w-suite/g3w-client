<!--
  @file
  @since v3.7
-->

<template>
  <ul class="nav navbar-nav navbar-right">
    <li v-for="item in items" :is="item" :key="item.id"></li>
  </ul>
</template>

<script>
  import NavbarItemsService from 'services/navbaritems';

  export default {

    /** @since 3.8.6 */
    name: "navbar-item-right",

    data() {
      return {
        items: NavbarItemsService.state.items.right
      }
    }
  }
</script>