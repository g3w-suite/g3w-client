<!--
  @file
  @since 3.10.0
-->

<template>

  <ul v-if="edit_url && menu.show"
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

    <!-- Click to open G3W-ADMIN's project page -->
    <li>
      <div>
        <!-- TODO: g3wtemplate.getFontClass('qgis') -->
        <span class="menu-icon skin-color-dark">
          <svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 32 32" style="height: 14px; vertical-align: -1.5px; fill: currentColor;">
            <path d="m17.61 17.63 4.36-.02-4-3.98h-4.36v4l4 4.45z"/>
            <path d="m31.61 27.22-7.62-7.6-4.38.01v4.33l7.24 7.67h4.76z"/>
            <path d="M18 25.18c-.68.16-1.17.2-1.9.2a9.77 9.77 0 0 1-9.68-9.88c0-5.57 4.4-9.78 9.68-9.78s9.48 4.2 9.48 9.78c0 .91-.15 1.96-.36 2.8l4.88 4.65a15 15 0 0 0 1.95-7.48C32.05 6.87 25.19.44 16 .44 6.86.44 0 6.84 0 15.47c0 8.68 6.86 15.2 16 15.2 2.36 0 4.23-.3 6.2-1.1L18 25.18z"/>
          </svg>
        </span>
        <b><a :href="edit_url" target="_blank" style="color: initial">Project settings</a></b>
      </div>
    </li>

  </ul>
</template>

<script>
  import ProjectsRegistry          from 'store/projects';
  import { CatalogEventBus as VM } from 'app/eventbus';
  import ApplicationService        from 'services/application';

  // const { t } = require('core/i18n/i18n.service');

  // const OFFSETMENU = {
  //   top: 50,
  //   left: 15
  // };

  export default {
    name: 'catalog-project-context-menu',

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

    computed: {

      edit_url() {
        return ApplicationService.getCurrentProject().getState().edit_url;
      },

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
     * @listens CatalogEventBus~show-project-context-menu
     * @listens CatalogEventBus~hide-project-context-menu
     */
    created() {
      VM.$on('show-project-context-menu', this.onShowProjectContextMenu);
      VM.$on('hide-project-context-menu', this._hideMenu);
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
