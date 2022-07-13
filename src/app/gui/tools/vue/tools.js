import { createCompiledTemplate } from 'gui/vue/utils';
import G3wTool from './tool.vue';

const { base, inherit } = require('core/utils/utils');
const GUI = require('gui/gui');
const Component = require('gui/component/component');
const ToolsService = require('gui/tools/service');
const compiledTemplate = createCompiledTemplate(require('./tools.html'));

const InternalComponent = Vue.extend({
  ...compiledTemplate,
  data() {
    return {
      state: null,
    };
  },
  watch: {
    'state.toolsGroups': {
      handler(groups) {
        this.$emit('visible', groups.length > 0);
      },
    },
  },
  components: {
    G3wTool,
  },
});

function ToolsComponent(options = {}) {
  base(this, options);
  this._service = new ToolsService(options);
  this.title = 'tools';

  const internalComponent = new InternalComponent({
    toolsService: this._service,
  });

  internalComponent.state = this._service.state;
  this.setInternalComponent(internalComponent, {
    events: [{ name: 'visible' }],
  });

  this._setOpen = function (bool = false) {
    this.internalComponent.state.open = bool;
    bool && GUI.closeContent();
  };
}

inherit(ToolsComponent, Component);

module.exports = ToolsComponent;
