import G3WTool from 'gui/tools/vue/tool.vue';
import G3WSearchQuerybuilder from 'gui/querybuilder/vue/g3w-search-querybuilder.vue';
import Component from 'gui/vue/component';
import Service from 'gui/search/service';
import template from './search.html';

const vueComponentOptions = {
  template,
  data() {
    return {
      state: null,
    };
  },
  components: {
    'g3w-tool': G3WTool,
    'g3w-search-querybuilder': G3WSearchQuerybuilder,
  },
  computed: {
    show() {
      return this.state.searches.length + this.state.searchtools.length + this.state.querybuildersearches.length > 0;
    },
  },
  methods: {
    showPanel(config = {}) {
      this.$options.service.showPanel(config);
    },
    removeItem({ type, index }) {
      this.$options.service.removeItem({
        type,
        index,
      });
    },
  },
  async mounted() {
    await this.$nextTick();
    $('.icon-search-action').tooltip();
  },
};

const InternalComponent = Vue.extend(vueComponentOptions);

class SearchComponent extends Component {
  constructor(options = {}) {
    super(options);
    this.id = 'search';
    this._service = options.service || new Service();
    this._service.init();
    this.title = this._service.getTitle();
    this.internalComponent = new InternalComponent({
      service: this._service,
    });
    this.internalComponent.state = this._service.state;
    this.state.visible = true;
  }

  _reload() {
    this._service.reload();
  }

  unmount() {
    this._searches_searchtools.$destroy();
    return super.unmount();
  }
}

export default SearchComponent;
