<!--
  @file
  @since v3.8.0
-->

<template>

  <ul v-if="menu.show"
    id="project-context-menu"
    ref="project-context-menu"
    class="catalog-context-menu"
    v-click-outside="closeLayerMenu"
    tabindex="-1"
    :style="{
      top: menu.top + 'px',
      left: menu.left + 'px'
    }"
  >

    <!-- Item Title -->
    <li class="title">
      <div>G3W-ADMIN {{ menu.title}}</div>
    </li>

    <!-- TODO add item description -->
    <li>
      <div style="display: flex; justify-content: space-between; align-items: center">
        <span>Layers (NOT YET IMPLEMENTED)</span>
      </div>
    </li>

  </ul>
</template>

<script>
  import ProjectsRegistry from 'store/projects';
  import CatalogEventHub from 'gui/catalog/vue/catalogeventhub';

  // const { t } = require('core/i18n/i18n.service');

  // const OFFSETMENU = {
  //   top: 50,
  //   left: 15
  // };

  export default {
    name: 'CatalogProjectmenu',

    props: {
      external: {
        type: Object
      }
    },

    data() {
      return {
        menu: {
          title: ProjectsRegistry.getCurrentProject().getName(),
          show: false,
          top:0,
          left:0,
          //layers
          layers: {
            show: false,
            top:0,
            left:0
          }
        }
      }
    },
  
    methods: {

      _hideMenu() {
        this.menu.show = false;
      },

      closeLayerMenu() {
        this._hideMenu();
      },

      showAdminLayers() {
        console.log('qui')
      },

      async onShowProjectContextMenu(evt) {
        this._hideMenu();
        await this.$nextTick();
        this.menu.left = evt.x;
        this.menu.show = true;
        await this.$nextTick();
        this.menu.top = $(evt.target).offset().top - $(this.$refs['project-context-menu']).height() + ($(evt.target).height() / 2);
      },

    },

    /**
     * @listens CatalogEventHub~show-project-context-menu
     * @listens CatalogEventHub~hide-project-context-menu
     */
    created() {
      CatalogEventHub.$on('show-project-context-menu', this.onShowProjectContextMenu);
      CatalogEventHub.$on('hide-project-context-menu', this._hideMenu);
    }
  };
</script>
<style scoped>
  #project-context-menu {
    background: #FAFAFA;
    border: 1px solid #BDBDBD;
    border-radius: 3px;
    display: block;
    list-style: none;
    margin: 0;
    padding: 0;
    position: fixed;
    min-width: 150px;
    z-index: 999999;
    color:#000000;
    outline: none;
  }

  li .item-text{
    font-weight: bold;
  }
</style>
