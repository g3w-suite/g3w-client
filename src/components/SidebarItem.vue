<!--
  @file
  @since v3.7
-->

<template>
  <li
    :id        = "component.id"
    v-show     = "state.visible"
    class      = "treeview sidebaritem"
    :class     = "{'active': open }"
    v-disabled = "state.disabled"
  >
    <bar-loader :loading="state.loading"/>
    <a
      @click.prevent = "onClickItem"
      ref            = "anchor_click"
      href           = "#"
      style          = "display: flex; justify-content: space-between; align-items: center"
    >
      <div>
        <i :class="icon" :style="{color: iconColor}"></i>
        <span class="treeview-label" v-t="title"></span>
      </div>
      <div>
        <span
          v-if   = "info.state"
          style  = "position: absolute; right: 5px; font-weight: bold"
          :class = "info.class"
          :style = "info.style"
          :title = "info.tooltip"
        >{{ info.state }}</span>
        <sidebar-item-action
          v-for      = "action in actions"
          :component ="component.internalComponent"
          :key       = "action.id"
          :action    = "action"
        />
      </div>
      <i v-if="collapsible" :class="g3wtemplate.getFontClass('angle-left')" class="pull-right"></i>
    </a>
    <div id="g3w-sidebarcomponent-placeholder"></div>
  </li>
</template>

<script>
  import { SidebarEventBus as VM } from 'app/eventbus';
  import SidebarItemAction from 'components/SidebarItemAction.vue';

  export default {
    name: "SidebarItem",
    data() {
      return {
        info: this.$options.info || { state: null, style: null, class: null },
        main: true,
        component: this.$options.component,
        active: false,
        title: '',
        open: false,
        icon: null,
        iconColor: null,
        collapsible: null
      };
    },
    components: {
      SidebarItemAction
    },
    methods: {
      onClickItem(evt) {
        // force to close
        this.component.isolate && evt.stopPropagation();
        if (!this.component.isolate) {
          // set state of opened component
          this.$options.service.state.components.forEach(component => {
            if (component !== this.component) {
              if (component.getOpen()) {
                component.click({
                  open:component.isolate
                });
              }
            }
          });
          !this.component.collapsible && isMobile.any && VM.$emit('sidebaritemclick');
        }
        this.component.setOpen(!this.component.state.open);
      }
    },
    created() {
      this.component.openClose = () => this.$refs.anchor_click.click();
    }
  }
</script>

<style scoped>

</style>