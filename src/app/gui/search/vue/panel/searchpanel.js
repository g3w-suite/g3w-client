import Select2 from './select2.vue'
import {EXPRESSION_OPERATORS} from 'core/layers/filter/operators';
const {base, inherit, debounce} = require('core/utils/utils');
const Panel = require('gui/panel');
const Service = require('./searchservice');
const compiledTemplate = Vue.compile(require('./searchpanel.html'));

const SearchPanelComponent = Vue.extend({
  ...compiledTemplate,
  components:{
    Select2
  },
  data: function() {
    return {
     state: this.$options.service.state
    }
  },
  methods: {
    getLabelOperator(operator){
      return `[ ${EXPRESSION_OPERATORS[operator]} ]`
    },
    async onFocus(event) {
      if (this.isMobile()) {
        const top = $(event.target).position().top - 10 ;
        await this.$nextTick();
        setTimeout(() => {
          $('.sidebar').scrollTop(top);
          }, 500);
      }
    },
    async autocompleteRequest(params={}){
      return this.$options.service.autocompleteRequest(params);
    },
    changeDependencyFields({attribute:field, value}) {
      const subscribers = this.$options.service.getDependencies(field);
      return subscribers.length ? this.$options.service.fillDependencyInputs({
        field,
        subscribers,
        value
      }): Promise.resolve();
    },
    changeNumericInput(input) {
      input.value = input.value || input.value === 0 ? input.value : null;
      this.changeInput(input);
    },
    changeInput({id, attribute, value}) {
      this.$options.service.changeInput({id, value});
      this.state.searching = true;
      this.changeDependencyFields({
        attribute,
        value
      }).finally(() => {
        this.state.searching = false;
      })
    },
    doSearch: function(event) {
     event.preventDefault();
     this.$options.service.run();
    }
  }
});

function SearchPanel(options = {}) {
  const service = options.service || new Service(options);
  this.setService(service);
  const SearchPanel = options.component || SearchPanelComponent;
  const internalPanel = new SearchPanel({
    service
  });
  this.setInternalPanel(internalPanel);
  this.unmount = function() {
    return base(this, 'unmount').then(() => {
      service.clear()
    })
  }
}

inherit(SearchPanel, Panel);

module.exports = SearchPanel;
