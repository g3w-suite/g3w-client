<!--
  @file
  @since v3.7
-->

<template>
  <li
    :id        = "component.id"
    v-show     = "component.state.visible"
    class      = "treeview sidebaritem"
    :class     = "{'active': open }"
    v-disabled = "component.state.disabled"
  >
    <bar-loader :loading = "component.state.loading"/>
    <a
      href  = "#"
      style = "display: flex; justify-content: space-between; align-items: center"
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
    <div ref="component-placeholder" ></div>
  </li>
</template>

<script>

  import ApplicationState from "store/application-state";

  export default {
    name: "SidebarItem",
    data() {
      const { component } = this.$options;
      return {
        info:        component.info || { state: null, style: null, class: null },
        main:        true,
        component,
        active:      false,
        title:       component.title || '',
        open:        !!component.state.open,
        icon:        component.icon,
        iconColor:   component.iconColor,
        collapsible: false !== component.collapsible,
        actions:     component.actions,
      };
    },
    methods: {
      triggerAction(action, component) {
        action.fnc(component);
      },
    },

    mounted() {
      const opts    = this.$options.opts;
      const sidebar = document.getElementById('g3w-sidebarcomponents');

      // append to `g3w-sidebarcomponents`
      if ([null, undefined].includes(opts.position) || opts.position < 0 || opts.position >= sidebar.children.length) {
        $(sidebar).append(this.$el);
      }
  
      // append to `g3w-sidebarcomponents` (by position)
      else {
        Array.from(sidebar.children).forEach((child, i) => {
          if (i === opts.position || child.id === opts.position) {
            child.insertAdjacentElement((!!opts.before || undefined === opts.before) ? 'beforebegin' : 'afterend', this.$el);
          }
        });
      }

      this.component.mount(this.$refs['component-placeholder']);

      // set component click handler
      this.component.click = ({ open = false } = {}) => {
        if (open) {
          ApplicationState.sidebar.components.forEach(comp => {
            if (comp !== this.component && comp.getOpen()) {
              comp.click({ open: false });
            }
          });
        }
        const node = this.component.getInternalComponent().$el;
        //@since 3.11.0 Need to add check of sidebar components, in case, for example, close
        // contents element and some sidebar component is related to it's close, for example, qplotly
        //a toggle menu open of <ul>
        node.classList.toggle('menu-open', open);
        // toggle active of <li> element
        node.parentNode.classList.toggle('active', open);

        this.component.setOpen(open);
      };
    },

  }
</script>