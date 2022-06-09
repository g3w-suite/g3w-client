import Select2 from './select2.vue'
import {EXPRESSION_OPERATORS} from 'core/layers/filter/operators';
import utils from 'core/utils/utils';
import Panel  from 'gui/panel';
import Service  from './searchservice';
import template from './searchpanel.html';

const SearchPanelComponent = {
  template,
  components:{
    Select2
  },
  data() {
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
    changeInput(input) {
      let {id, attribute, value, type} = input;
      try {
        //try to trim value inside try catch some cases tha trim doesn't work to avoid
        // to check if has one reason to trim
        value = type === 'textfield' || type === 'textField' ? value : value.trim();
      } catch(err){}
      this.$options.service.changeInput({id, value});
      this.state.searching = true;
      this.changeDependencyFields({
        attribute,
        value
      }).finally(() => {
        this.state.searching = false;
      })
    },
    doSearch(event) {
     event.preventDefault();
     this.$options.service.run();
    }
  }
};

class SearchPanel extends Panel {
  constructor(options={}) {
    super(options);
    const service = options.service || new Service(options);
    this.setService(service);
    this.id = utils.uniqueId();
    const SearchPanel = options.component || SearchPanelComponent;
    const internalPanel = new SearchPanel({
      service
    });
    this.setInternalPanel(internalPanel);
  }

  unmount() {
    return super.unmount().then(() => {
      service.clear()
    })
  }
}

export default  SearchPanel;
