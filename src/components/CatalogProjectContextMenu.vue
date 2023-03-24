<!--
  @file
  @since v3.7.0
-->

<template>

  <ul v-if="layerMenu.show"
    id="project-context-menu"
    ref="project-context-menu"
    v-click-outside-context-menu="closeLayerMenu"
    tabindex="-1"
    :style="{top: layerMenu.top + 'px', left: layerMenu.left + 'px' }"
  >

    <!-- Item Title -->
    <li class="title">
      <div>{{ projectMenu.title}}</div>
    </li>

  </ul>
</template>

<script>
  import ProjectsRegistry from 'store/projects';

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
        projectMenu: {
          title: ProjectsRegistry.getCurrentProject().getName(),
          show: false,
          top:0,
          left:0,
          tooltip: false,
          //metadataInfo
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
        this.projectMenu.show = false;
        this.projectMenu.styles = false;
      },
      closeLayerMenu(menu={}) {
        this._hideMenu();
        this.showColorMenu(false);
        menu.show = false;
      },
      showAdminLayers(){

      }

    },
    created() {
      CatalogEventHub.$on('show-project-context-menu', async (evt) => {
        this._hideMenu();
        await this.$nextTick();
        this.projectMenu.left = evt.x;
        this.projectMenu.name = layerstree.name;
        this.projectMenu.show = true;
        await this.$nextTick();
        this.projectMenu.top = $(evt.target).offset().top - $(this.$refs['project-context-menu']).height() + ($(evt.target).height()/ 2);
      });
    }
  };
</script>
<style scoped>
  li .item-text{
    font-weight: bold;
  }
</style>
