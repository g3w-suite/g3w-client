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
    <bar-loader :loading = "state.loading"/>
    <a
      @click.prevent = "onClickItem"
      ref            = "anchor_click"
      href           = "#"
      style          = "display: flex; justify-content: space-between; align-items: center"
    >
      <div>
        <i :class = "icon" :style = "{ color: iconColor }"></i>
        <span class = "treeview-label" v-t = "title"></span>
      </div>
      <div>
        <span
          v-if   = "info.state"
          style  = "position: absolute; right: 5px; font-weight: bold"
          :class = "info.class"
          :style = "info.style"
          :title = "info.tooltip"
        >{{ info.state }}</span>
        <!-- ORIGINAL SOURCE: src/components/SidebarItemAction.vue@v3.10.2 -->
        <span
          v-for                   = "action in actions"
          :key                    = "action.id"
          @click.stop             = "triggerAction(action, component.internalComponent)"
          v-t-tooltip:left.create = "action.tooltip"
          style                   = "font-weight: bold; padding:3px;"
          :class                  = "action.class"
          class                   = "action skin-tooltip-left"
          :style                  = "action.style"
        ></span>
      </div>
      <i
        v-if   = "collapsible"
        :class = "g3wtemplate.getFontClass('angle-left')"
        class  ="pull-right">
      </i>
    </a>
    <div id = "g3w-sidebarcomponent-placeholder"></div>
  </li>
</template>

<script>
  import { SidebarEventBus as VM } from 'app/eventbus';

  export default {
    name: "SidebarItem",
    data() {
      return {
        info:        this.$options.info || { state: null, style: null, class: null },
        main:        true,
        component:   this.$options.component,
        active:      false,
        title:       '',
        open:        false,
        icon:        null,
        iconColor:   null,
        collapsible: null
      };
    },
    methods: {
      triggerAction(action, component) {
        action.fnc(component);
      },
      onClickItem() {
        // force to close
        this.$options.service.state.components.forEach(component => {
          if (component !== this.component && component.getOpen()) {
            component.click({ open: false });
          }
        });
        if (!this.component.collapsible && isMobile.any) {
          VM.$emit('sidebaritemclick')
        }
        this.component.setOpen(!this.component.state.open);
      }
    },
  }
</script>

<style scoped>

</style>