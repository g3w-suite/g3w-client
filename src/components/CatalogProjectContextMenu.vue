<!--
  @file
  @since v3.7.0
-->

<template>

  <ul v-if="menu.show"
    id="project-context-menu"
    ref="project-context-menu"
    v-click-outside-context-menu="closeLayerMenu"
    tabindex="-1"
    :style="{top: menu.top + 'px', left: menu.left + 'px' }"
  >

    <!-- Item Title -->
    <li class="title">
      <div>{{ menu.title}}</div>
    </li>

  </ul>
</template>

<script>
  import ProjectsRegistry from 'store/projects';
  import CatalogEventHub from 'gui/catalog/vue/catalogeventhub';

  const { t } = require('core/i18n/i18n.service');

  const OFFSETMENU = {
    top: 50,
    left: 15
  };

  export default {
    name: 'CatalogProjectmenu',
    props: {
      external: {
        type: Object
      }
    },
    data(){
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
      showAdminLayers(){
        console.log('qui')
      }
    },
    created() {
      CatalogEventHub.$on('show-project-context-menu', async (evt) => {
        this._hideMenu();
        await this.$nextTick();
        this.menu.left = evt.x;
        this.menu.show = true;
        await this.$nextTick();
        this.menu.top = $(evt.target).offset().top - $(this.$refs['project-context-menu']).height() + ($(evt.target).height()/ 2);
      });
    }
  };
</script>
<style scoped>
  li .item-text{
    font-weight: bold;
  }
</style>
