<!--
  @file
  @since v3.7
-->

<template>
  <aside class="main-sidebar" :class="{ iframe: iframe, 'g3w-disabled': disabled }" >
    <!-- sidebar: style can be found in g3w-sidebar.less -->
    <!-- Sidebar toggle button (desktop only) -->
    <a href="#" class="sidebar-aside-toggle" data-widget="pushmenu" data-toggle="offcanvas" role="button">
      <i :class="g3wtemplate.getFontClass('bars')"></i>
    </a>
    <div id="g3w-sidebar" class="sidebar">
      <div id="disable-sidebar"></div>
      <div v-show="panelsinstack" class="g3w-sidebarpanel">
        <div id="g3w-sidebarpanel-header-placeholder" style="overflow: hidden;line-height: 14px; font-size:1.5em">
          <div style="display: flex;" :style="{justifyContent: state.gui.title ? 'space-between' : 'flex-end' }">
            <h4 v-if="state.gui.title" style="display: inline-block; font-weight: bold" v-t="state.gui.title"></h4>
            <div>
            <span v-if="panels.length > 1" @click="closePanel" data-placement="left" data-toggle="tooltip" v-t-tooltip.create="'back'" class="skin-tooltip-left g3w-span-button close-pane-button fa-stack">
              <i :class="g3wtemplate.getFontClass('circle')" class="fa-stack-1x panel-button"></i>
              <i :class="g3wtemplate.getFontClass('arrow-left')" class="fa-stack-1x panel-icon"></i>
            </span>
              <span @click="closeAllPanels" data-placement="left" data-toggle="tooltip" v-t-tooltip.create="'close'" class="skin-tooltip-left g3w-span-button close-pane-button fa-stack">
              <i :class="g3wtemplate.getFontClass('circle')" class="fa-stack-1x panel-button"></i>
              <i :class="g3wtemplate.getFontClass('close')" class="fa-stack-1x panel-icon"></i>
            </span>
            </div>
          </div>
        </div>
        <div id="g3w-sidebarpanel-placeholder" class="g3w-sidebarpanel-placeholder"></div>
      </div>
      <div id="g3w-sidebarcomponents-content" >
        <ul id="g3w-sidebarcomponents" v-show="showmainpanel" class="sidebar-menu" :class="{'g3w-disabled': state.disabled}"></ul>
      </div>
    </div>
    <!-- /.sidebar -->
  </aside>
</template>

<script>
  import ApplicationState from 'store/application-state';
  import SIDEBAREVENTBUS from 'gui/sidebar/eventbus';
  import sidebarService from 'services/sidebar';

  export default {
    name: "Sidebar",
    data() {
      return {
        components: sidebarService.state.components,
        panels: sidebarService.stack.state.contentsdata,
        bOpen: true,
        bPageMode: false,
        header: this.$t('main navigation'),
        state: sidebarService.state
      }
    },
    computed: {
      disabled(){
        return ApplicationState.gui.sidebar.disabled;
      },
      panelsinstack(){
        return this.panels.length > 0;
      },
      showmainpanel(){
        return this.components.length>0 && !this.panelsinstack;
      },
      componentname(){
        return this.components.length ? this.components.slice(-1)[0].getTitle(): "";
      },
      panelname(){
        let name = "";
        if (this.panels.length){
          name = this.panels.slice(-1)[0].content.getTitle();
        }
        return name;
      }
    },
    methods: {
      closePanel() {
        sidebarService.closePanel();
      },
      closeAllPanels(){
        sidebarService.closeAllPanels();
      }
    },
    created() {
      this.iframe = ApplicationState.iframe;
      SIDEBAREVENTBUS.$on('sidebaritemclick', ()=> $('.sidebar-toggle').click())
    }
  }
</script>

<style scoped>

</style>