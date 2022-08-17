import G3WTool from 'gui/tools/vue/tool.vue'
import G3WSearchQuerybuilder from 'gui/querybuilder/vue/g3w-search-querybuilder.vue';
import { createCompiledTemplate } from 'gui/vue/utils';
const {inherit, base} = require('core/utils/utils');
const Component = require('gui/component/component');
const Service = require('gui/search/service');
const templateCompiled = createCompiledTemplate(require('./search.html'));

const vueComponentOptions = {
  ...templateCompiled,
  data() {
    return {
      state: null
    }
  },
  components: {
    'g3w-tool': G3WTool,
    'g3w-search-querybuilder': G3WSearchQuerybuilder
  },
  computed: {
    show(){
      return this.state.searches.length + this.state.searchtools.length + this.state.querybuildersearches.length > 0;
    }
  },
  methods: {
    showPanel(config={}) {
      this.$options.service.showPanel(config);
    },
    removeItem({type, index}){
      this.$options.service.removeItem({
        type,
        index
      })
    }
  },
  async mounted() {
    await this.$nextTick();
    $('.icon-search-action').tooltip();
  }
};

const InternalComponent = Vue.extend(vueComponentOptions);

function SearchComponent(options={}){
  base(this, options);
  this.id = "search";
  this._service = options.service || new Service();
  this._service.init();
  this.title = this._service.getTitle();
  this.internalComponent = new InternalComponent({
    service: this._service
  });
  this.internalComponent.state = this._service.state;
  this.state.visible = true;
  this._reload = function() {
    this._service.reload();
  };
  this.unmount = function() {
    this._searches_searchtools.$destroy();
    return base(this, 'unmount');
  }
}

inherit(SearchComponent, Component);

module.exports = SearchComponent;
