import G3wTool from './tool.vue';
import GUI  from 'gui/gui';
import Component  from 'gui/vue/component';
import ToolsService  from 'gui/tools/service';
import template from './tools.html';
const InternalComponent = Vue.extend({
  template,
  data() {
    return {
      state: null
    }
  },
  watch: {
    'state.toolsGroups': {
      handler(groups) {
        this.$emit('visible', groups.length > 0);
      }
    }
  },
  components: {
    G3wTool
  }
});

class ToolsComponent extends Component {
  constructor(options={}) {
    super(options);
    this._service = new ToolsService(options);
    this.title = "tools";

    const internalComponent = new InternalComponent({
      toolsService: this._service
    });

    internalComponent.state = this._service.state;
    this.setInternalComponent(internalComponent, {
      events: [{name: 'visible'}]
    });
  }

  _setOpen(bool=false) {
    this.internalComponent.state.open = bool;
    bool && GUI.closeContent();
  }
}



export default  ToolsComponent;
