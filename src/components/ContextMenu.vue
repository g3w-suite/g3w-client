<!--
  @file inspired by: https://github.com/Rudeus3Greyrat/vue-context-menu/ (v1.9.0)
  @since 3.9.0

  @example add context menu to 'main' container:
    <main></main>
    <context-menu @select="onContextMenu" :divided="true">
        <context-menu-item select="download">Download</context-menu-item>
        <context-menu-item select="rename" :disabled="true">Rename</context-menu-item>
        <context-menu-item select="more">More Info</context-menu-item>
    </context-menu>
-->
<template>
  <ul ref="menu" class="vue-context-menu-list" :id="dynamicId">
    <slot></slot>
  </ul>
</template>

<script>
export default {

  name: "ContextMenu",

  data() {
    return {
      dynamicId: '',
    }
  },

  created() {
    this.dynamicId = String(Math.random())
  },

  async mounted() {
    let menu = this.$refs.menu;
    menu.previousElementSibling.oncontextmenu = function (e) {
      e.preventDefault()
      let itemList = [...document.getElementsByClassName('vue-context-menu-list')];
      if (itemList.some(el => 'none' !== el.style.display)) {
        itemList.forEach(el => el.style.display = 'none');
      }
      menu.style.display = 'block';
      menu.style.left = e.clientX + 'px';
      menu.style.top = e.clientY + 'px';
      document.onclick = function () { menu.style.display = 'none' };
    }
  },

}
</script>

<style scoped>
  ul {
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .vue-context-menu-list {
    border: 1px solid darkgrey;
    background-color: #fff;
    display: none;
    position: fixed;
    z-index: 10000;
  }
</style>