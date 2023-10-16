import ProjectsRegistry from 'store/projects';

const { base, inherit } = require('utils');
const G3WObject = require('core/g3wobject');

function Service(options={}){
  this.config = null;
  this.state = {
    ...options,
    toolsGroups: [],
    visible: false,
    loading: false
  };
  this.setters = {
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
    removeToolGroup(name){
      return this._removeToolGroup(name);
    },
    removeTools() {
      return this._removeTools();
    }
  };

  base(this);

  const project = ProjectsRegistry.getCurrentProject();
  const {tools={}} = project.getState();
  for (let toolName in tools) {
    const groupName = toolName.toUpperCase();
    this.addToolGroup(0, groupName);
    const _tools = tools[toolName].map(tool => ({
      name: tool.name,
      action: ToolsService.ACTIONS[toolName].bind(null, tool)
    }));
    this.addTools(_tools, {position: 0, title: groupName})
  }
}

inherit(Service, G3WObject);

const proto = Service.prototype;

proto.reload = function() {
  this.removeTools();
};

proto._addTool = function(tool, {position : order, title: name}) {
  let group = this._addToolGroup(order, name);
  if (tool.action === undefined && tool.type)
    tool.action = Service.ACTIONS[tool.type] ? Service.ACTIONS[tool.type].bind(null, tool.options) : ()=>{};
  group.tools.push(tool);
};

proto._addTools = function(tools, groupName) {
  tools.forEach(tool => this.addTool(tool, groupName));
};

proto.setLoading = function(bool=false) {
  this.state.loading = bool;
};

proto._removeTool = function(toolIdx) {
  this.state.toolsGroups = this.state.toolsGroups.splice(toolIdx, 1);
};

proto._removeTools = function() {
  this.state.toolsGroups.splice(0);
};

proto.updateToolsGroup = function(order, groupConfig) {
  Vue.set(this.state.toolsGroups, order, groupConfig);
};

proto.getState = function() {
  return this.state;
};

proto._removeToolGroup = function(name) {
  this.state.toolsGroups = this.state.toolsGroups.filter(group => group.name !== name);
};

proto._addToolGroup = function(order, name) {
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

proto.setToolState = function({id, state={type:null, message: null}}={}){
  this.state.toolsGroups.find(toolGroup => {
    const tool = toolGroup.tools.find(tool => tool.name === id);
    if (tool) {
      tool.state.type = state.type;
      tool.state.message = state.message;
      return true;
    }
  })
};

Service.ACTIONS = {};

module.exports = Service;
