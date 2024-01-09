<!--
  @file
  @since v3.7
-->

<template>
    <aside>
      <div
        class  = "main-sidebar"
        :class = "{ iframe: iframe}"
      >
        <!-- SIDEBAR CONTENT (additional styles can be found in g3w-sidebar.less) -->
        <div
          id     = "g3w-sidebar"
          class  = "sidebar"
          :class = "{ 'g3w-disabled': disabled }"
        >
          <div id="disable-sidebar"></div>

          <div
            v-show = "panelsinstack"
            class = "g3w-sidebarpanel"
          >
            <div
              id    = "g3w-sidebarpanel-header-placeholder"
              style = "overflow: hidden; line-height: 14px;font-size:1.5em"
              >
                <div
                  style  = "display: flex;"
                  :style = "{ justifyContent: state.gui.title ? 'space-between' : 'flex-end' }"
                >

                  <h4
                    v-if  = "title"
                    style = "display: inline-block; font-weight: bold"
                    v-t   = "title"
                  ></h4>

                  <div>
                    <span
                      v-if               = "panels.length > 1"
                      @click             = "closePanel"
                      data-placement     = "left"
                      data-toggle        = "tooltip"
                      data-container     = "body"
                      v-t-tooltip.create = "'back'"
                      class              = "skin-tooltip-left g3w-span-button close-pane-button fa-stack"
                    >
                      <i :class="g3wtemplate.getFontClass('circle')"     class="fa-stack-1x panel-button"></i>
                      <i :class="g3wtemplate.getFontClass('arrow-left')" class="fa-stack-1x panel-icon"></i>
                    </span>
                    <span
                      @click             = "closeAllPanels"
                      data-placement     = "left"
                      data-toggle        = "tooltip"
                      data-container     = "body"
                      v-t-tooltip.create = "'close'"
                      class              = "skin-tooltip-left g3w-span-button close-pane-button fa-stack"
                    >
                      <i :class="g3wtemplate.getFontClass('circle')" class="fa-stack-1x panel-button"></i>
                      <i :class="g3wtemplate.getFontClass('close')"  class="fa-stack-1x panel-icon"></i>
                    </span>
                  </div>

                </div>
            </div>

            <div
              id    = "g3w-sidebarpanel-placeholder"
              class = "g3w-sidebarpanel-placeholder"
            ></div>
          </div>

          <div id="g3w-sidebarcomponents-content" >
            <ul
              id     = "g3w-sidebarcomponents"
              v-show = "showmainpanel"
              class  = "sidebar-menu"
              :class = "{ 'g3w-disabled': state.disabled }"
            ></ul>
          </div>

        </div>

      </div>
      <!-- TOGGLE BUTTON (desktop only) -->
      <a
        href        = "#"
        class       = "sidebar-aside-toggle"
        :class      = "{ 'g3w-disabled': disabled, 'iframe': iframe}"
        :style      = "{zIndex: zIndex}"
        data-toggle = "offcanvas" role="button">
          <i :class="g3wtemplate.getFontClass('bars')"></i>
      </a>

    </aside>
</template>

<script>
  import ApplicationState          from 'store/application-state';
  import { SidebarEventBus as VM } from 'app/eventbus';
  import sidebarService            from 'services/sidebar';
  import { ZINDEXES }              from 'app/constant';


  const { t } = require('core/i18n/i18n.service');

  export default {

    name: "Sidebar",

    data() {
      return {
        components: sidebarService.state.components,
        panels:     sidebarService.stack.state.contentsdata,
        bOpen:      true,
        bPageMode:  false,
        header:     t('main navigation'),
        state:      sidebarService.state,
        /** @since 3.9.0 */
        zIndex:     ZINDEXES.usermessage.tool + 2,

      }
    },

    computed: {

      title() {
        return this.state.gui.title;
      },

      disabled() {
        return ApplicationState.gui.sidebar.disabled;
      },

      panelsinstack() {
        return this.panels.length > 0;
      },

      showmainpanel() {
        return this.components.length>0 && !this.panelsinstack;
      },

      componentname() {
        return this.components.length ? this.components.slice(-1)[0].getTitle(): '';
      },

      panelname() {
        return this.panels.length ? this.panels.slice(-1)[0].content.getTitle() : '';
      },

    },

    methods: {

      closePanel() {
        sidebarService.closePanel();
      },

      closeAllPanels() {
        sidebarService.closeAllPanels();
      },

    },

    created() {
      this.iframe = ApplicationState.iframe;
      VM.$on('sidebaritemclick', () => $('.sidebar-toggle').click())
    },

  };
</script>

<style scoped>

</style>