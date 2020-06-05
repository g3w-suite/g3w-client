import Select2 from './select2.vue'
const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const Panel = require('gui/panel');
const Service = require('./searchservice');
const compiledTemplate = Vue.compile(require('./searchpanel.html'));

const SearchPanelComponent = Vue.extend({
  ...compiledTemplate,
  components:{
    Select2
  },
  data: function() {
    this.select2 = null;
    return {
     state: this.$options.service.state
    }
  },
  methods: {
    onFocus(event) {
      if (this.isMobile()) {
        const top = $(event.target).position().top - 10 ;
        this.$nextTick(()=> {
          setTimeout(() => {
            $('.sidebar').scrollTop(top);
          }, 500)
        });
      }
    },
    changeDependencyFields({attribute:field, value, fillfieldspromises=[]}) {
      const dependency = this.state.dependencies.find((_dependency) => {
        return field === _dependency.observer
      });
      if (dependency) {
        const subscribers = dependency.subscribers || [];
        for (let i = subscribers.length; i--;) {
          const forminputvalue = this.state.forminputs.find((input) => {
            return input.attribute === subscribers[i].attribute;
          });
          const dependance = subscribers[i].options.dependance;
          fillfieldspromises.push(this.$options.service.fillDependencyInputs({
            field,
            dependance,
            subscribers,
            value
          }));
          forminputvalue.value = '';
          this.changeDependencyFields({
            attribute: forminputvalue.attribute,
            value: forminputvalue.value,
            fillfieldspromises
          })
        }
      }
      return fillfieldspromises;
    },
    changeNumericInput(input) {
      input.value = input.value || input.value === 0 ? input.value : null;
    },
    changeInput({attribute, value}={}) {
      this.$options.service.changeInput({attribute, value});
      //check id there are dependencies
      const fillDependencyPromises = this.changeDependencyFields({
        attribute,
        value
      });
      if (fillDependencyPromises.length) {
        this.state.searching = true;
        Promise.all(fillDependencyPromises).then(() => {
          this.state.searching = false;
        })
      }
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
