import { createCompiledTemplate } from 'gui/vue/utils';
import ApplicationState from 'core/applicationstate';
const inherit = require('core/utils/utils').inherit;
const GUI = require('gui/gui');
const Component = require('gui/vue/component');
const Service = require('../formservice');
const base = require('core/utils/utils').base;
const compiledTemplate = createCompiledTemplate(require('./form.html'));
const HeaderFormComponent = require('../components/header/vue/header');
const BodyFormComponent = require('../components/body/vue/body');
const G3wFormFooter = require('gui/form/components/footer/vue/footer');

//vue component
const vueComponentObject = {
 ...compiledTemplate,
  data: function() {
    return {
      state: {},
      switchcomponent: false
    }
  },
  components: {
    g3wformheader: HeaderFormComponent,
    G3wFormFooter
  },
  transitions: {'addremovetransition': 'showhide'},
  methods: {
    disableComponent({index=-1, disabled=false}) {
      this.$options.service.disableComponent({
        index,
        disabled
      });
    },
    switchComponent(index) {
      this.switchcomponent = true;
      this.$options.service.setComponentByIndex(index);
    },
    changeInput: function(input) {
      return this.$options.service.isValid(input);
    },
    addToValidate: function(input) {
      this.$options.service.addToValidate(input);
    },
    // set layout
    reloadLayout: function() {
      const height = $(this.$el).height();
      if(!height)
        return;
      const footerHeight = $('.g3wform_footer').height() ? $('.g3wform_footer').height() + 50 : 50;
      $(this.$el).find(".g3wform_body").height(height - ($('.g3wform_header').height() +  footerHeight));
    },
  },
  updated() {
    this.$nextTick(()=> {
      if (this.switchcomponent) {
        setTimeout(()=>{
          this.switchcomponent = false;
        }, 0)
      }
    })
  },
  created() {
    this.$options.service.getEventBus().$on('set-main-component', () => {
      this.switchComponent(0);
    });
    this.$options.service.getEventBus().$on('component-validation', ({id, valid}) => {
      this.$options.service.setValidComponent({
        id,
        valid
      });
    });
    this.$options.service.getEventBus().$on('addtovalidate', this.addToValidate);
    this.$options.service.getEventBus().$on('disable-component', this.disableComponent);
  },
  mounted() {
    // check if is valid form (it used by footer component)
    this.$options.service.isValid();
  },
  beforeDestroy() {
    this.$options.service.clearAll();
  }
};

function FormComponent(options = {}) {
  options.id = options.id || 'form';
  base(this, options);
  options.service = options.service ?  new options.service : new Service;
  options.vueComponentObject = options.vueComponentObject  || vueComponentObject;
  //set statdar element of the form
  const components = options.components || [
    {id: options.id, title: options.title, name:options.name, component: BodyFormComponent}
  ];
  // initialize component
  this.init(options);
  this.getService().addComponents(components);
  this.getService().setComponent(components[0].component);

  this.addFormComponents = function(components = []) {
    this.getService().addComponents(components);
  };

  this.addFormComponent = function(component) {
    component && this.getService().addComponent(component)
  };
  // some utilities methods
  this.addDependecyComponents = function(components) {
    this.getService().addDependecyComponents(components)
  };
  this.addComponentBeforeBody = function(Component) {
    //this.getService().addedComponentTo('body');
    //this.insertComponentAt(1, Component);
  };

  this.addComponentAfterBody = function(Component) {
    //this.getService().addedComponentTo('body');
    //this.insertComponentAt(2, Component)
  };

  this.addComponentBeforeFooter = function() {
   //TODO
  };

  this.addComponentAfterFooter = function(Component) {
    //TODO
  };
  // overwrite father mount method.
  this.mount = function(parent, append) {
    return base(this, 'mount', parent, append)
    .then(() => {
      // set modal window to true
      GUI.setModal(true);
    });
  };

  this.layout = function() {
    this.internalComponent.reloadLayout();
  };
}

inherit(FormComponent, Component);

module.exports = FormComponent;

