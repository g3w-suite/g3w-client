import ProjectRegistry  from 'core/project/projectsregistry';
import G3WObject from 'core/g3wobject';

class Service extends G3WObject {
  constructor(options = {}) {
    super({
      setters: {
        addTool(tool, groupName) {
          tool.state = tool.state ? tool.state : {
            type: null,
            message: null
          };
          return this._addTool(tool, groupName);
        },
        addTools(tools, groupName) {
          return this._addTools(tools, groupName);
        },
        addToolGroup(order, name) {
          return this._addToolGroup(order, name);
        },
        removeToolGroup(name) {
          return this._removeToolGroup(name);
        },
        removeTools() {
          return this._removeTools();
        }
      }
    });
    this.config = null;
    this.state = {
      ...options,
      toolsGroups: [],
      visible: false,
      loading: false
    };
    const project = ProjectRegistry.getCurrentProject();
    const {tools = {}} = project.getState();
    for (let toolName in tools) {
      const groupName = toolName.toUpperCase();
      this.addToolGroup(0, groupName);
      const _tools = tools[toolName].map(tool => ({
        name: tool.name,
        action: ToolsService.ACTIONS[toolName].bind(null, tool)
      }));
      this.addTools(_tools, {position: 0, title: groupName})
    }
  };

  reload() {
    this.removeTools();
  };

  _addTool(tool, {position: order, title: name}) {
    let group = this._addToolGroup(order, name);
    if (tool.action === undefined && tool.type)
      tool.action = Service.ACTIONS[tool.type] ? Service.ACTIONS[tool.type].bind(null, tool.options) : () => {
      };
    group.tools.push(tool);
  };

  _addTools(tools, groupName) {
    tools.forEach(tool => this.addTool(tool, groupName));
  };

  setLoading(bool = false) {
    this.state.loading = bool;
  };

  _removeTool(toolIdx) {
    this.state.toolsGroups = this.state.toolsGroups.splice(toolIdx, 1);
  };

  _removeTools() {
    this.state.toolsGroups.splice(0);
  };

  updateToolsGroup(order, groupConfig) {
    Vue.set(this.state.toolsGroups, order, groupConfig);
  };

  getState() {
    return this.state;
  };

  _removeToolGroup(name) {
    this.state.toolsGroups = this.state.toolsGroups.filter(group => group.name !== name);
  };

  _addToolGroup(order, name) {
    let group = this.state.toolsGroups.find(_group => _group.name === name);
    if (!group) {
      group = {
        name,
        tools: []
      };
      this.state.toolsGroups.splice(order, 0, group);
    }
    return group;
  };

  setToolState({id, state = {type: null, message: null}} = {}) {
    this.state.toolsGroups.find(toolGroup => {
      const tool = toolGroup.tools.find(tool => tool.name === id);
      if (tool) {
        tool.state.type = state.type;
        tool.state.message = state.message;
        return true;
      }
    })
  };

  static ACTIONS = {};
}


export default  Service;
