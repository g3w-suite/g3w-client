/**
 * @file
 * @since 3.10.0
 */

import Component        from 'core/g3w-component';
import G3WObject        from 'core/g3w-object';
import ProjectsRegistry from 'store/projects';
import GUI              from 'services/gui';
import noop             from 'utils/noop';

import G3wTool          from 'components/Tool.vue';

/** @TODO check if deprecated */
const ACTIONS = {};

/**
 * ORIGINAL SOURCE:
 * - src/app/gui/tools/vue/tools.js@v3.9.3
 * - src/app/gui/tools/service.js@v3.9.3
 * - src/components/Tools.vue@v3.9.3
 */
export default function(opts = {}) {

  const project = ProjectsRegistry.getCurrentProject();
  const state   = {
    ...opts,
    toolsGroups: [],
    visible: false,
    loading: false
  };

  const service = new G3WObject({ setters: {
    addTool(tool, { title, position }) {
      let group = state.toolsGroups.find(g => g.name === title);
      if (!group) { group = { name: title, tools: [] }; state.toolsGroups.splice(position, 0, group); }
      return group.tools.push(Object.assign(tool, {
        state:  tool.state || ({ type: null, message: null }),
        action: tool.action || (ACTIONS[tool.type] || noop).bind(null, tool.options)
      }));
    },
    addToolGroup(position, name) {
      let group = state.toolsGroups.find(g => g.name === name);
      if (!group) { group = { name, tools: [] }; state.toolsGroups.splice(position, 0, group); }
      return group;  
    },
    addTools(tools, groupName)   { tools.forEach(t => this.addTool(t, groupName)); },
    removeToolGroup(name)        { state.toolsGroups = state.toolsGroups.filter(g => g.name !== name); },
    removeTools()                { state.toolsGroups.splice(0); },
  }});

  service.state            = state;
  service.config           = null;
  service.getState         = () => state;
  service.reload           = () => { service.removeTools(); };
  service.setLoading       = (bool = false) => { state.loading = bool; }
  service.updateToolsGroup = (order, config) => { Vue.set(state.toolsGroups, order, config); }
  service.setToolState     = ({ id, state: newState = { type: null, message: null } } = {}) => {
    state.toolsGroups.find(g => {
      const tool = g.tools.find(t => t.name === id);
      if (tool) {
        tool.state.type    = newState.type;
        tool.state.message = newState.message;
        return true;
      }
    })
  };

  // static class field
  service.ACTIONS = ACTIONS;

  const tools = project.getState().tools || {};

  for (let t in tools) {
    service.addToolGroup(0, t.toUpperCase());
    service.addTools(
      tools[t].map(tool => ({ name: tool.name, action: ACTIONS[t].bind(null, tool) })),
      { position: 0, title: t.toUpperCase() }
    );
  }

  const comp = new Component({
    ...opts,
    title: "tools",
    service,
    internalComponent: new (Vue.extend({
      template: /* html */ `
        <ul class="g3w-tools treeview-menu">
          <bar-loader :loading="state.loading"/>
          <li v-for="g in state.toolsGroups" :key="g.name">
            <div class="tool-header"><i :class="g3wtemplate.getFontClass('tool')"></i><span>{{ g.name }}</span></div>
            <div :id="g.name + '-tools'" class="tool-box"><g3w-tool v-for="t in g.tools" :key="t.name" :tool="t" /></div>
          </li>
        </ul>`,
      components: { G3wTool },
      data: () => ({ state: null }),
      watch: {
        async 'state.toolsGroups'(g) {
          comp.setVisible(g.length > 0);
          this.$emit('visible', g.length > 0);
          await this.$nextTick();
          document.querySelector('#g3w-sidebarcomponents #tools').classList.toggle('single', 1 === g.length);
        }
      },
    }))(),
  });

  comp._setOpen = (b=false) => {
    comp.internalComponent.state.open = b;
    if (b) {
      GUI.closeContent();
    }
  };

  return comp;
}