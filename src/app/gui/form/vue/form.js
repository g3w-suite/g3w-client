import GUI from 'gui/gui';
import Component from 'gui/vue/component';
import G3wFormFooter from 'gui/form/components/footer/vue/footer';
import Service from '../formservice';
import template from './form.html';
import HeaderFormComponent from '../components/header/vue/header';
import BodyFormComponent from '../components/body/vue/body';

// vue component
const vueComponentObject = {
  template,
  data() {
    return {
      state: {},
      switchcomponent: false,
      body: {
        components: {
          before: [],
          after: [],
        },
      },
    };
  },
  components: {
    g3wformheader: HeaderFormComponent,
    G3wFormFooter,
  },
  transitions: { addremovetransition: 'showhide' },
  methods: {
    isRootComponent(component) {
      return this.$options.service.isRootComponent(component);
    },
    backToRoot() {
      this.$options.service.setRootComponent();
    },
    handleRelation(relationId) {
      this.$options.service.handleRelation(relationId);
    },
    disableComponent({ id, disabled = false }) {
      this.$options.service.disableComponent({
        id,
        disabled,
      });
    },
    resizeForm(perc) {
      this.$options.service.setCurrentFormPercentage(perc);
    },
    switchComponent(id) {
      this.switchcomponent = true;
      this.$options.service.setCurrentComponentById(id);
    },
    changeInput(input) {
      return this.$options.service.changeInput(input);
    },
    addToValidate(input) {
      this.$options.service.addToValidate(input);
    },
    // set layout
    reloadLayout() {
      const height = $(this.$el).height();
      if (!height) return;
      const footerDOM = $(this.$refs.g3w_form_footer.$el);
      const bodyFromDOM = $(this.$refs.g3wform_body);
      const footerHeight = footerDOM.height() ? footerDOM.height() + 50 : 50;
      const bodyHeight = height - ($(this.$refs.g3wformheader.$el).height() + footerHeight);
      bodyFromDOM.height(bodyHeight);
    },
  },
  async updated() {
    await this.$nextTick();
    this.switchcomponent && setTimeout(() => this.switchcomponent = false, 0);
  },
  created() {
    this.$options.service.getEventBus().$on('set-main-component', () => {
      this.switchComponent(0);
    });
    this.$options.service.getEventBus().$on('component-validation', ({ id, valid }) => {
      this.$options.service.setValidComponent({
        id,
        valid,
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
  },
};

class FormComponent extends Component {
  constructor(options = {}) {
    const { id = 'form', name, title } = options;
    super(options);
    options.service = options.service ? new options.service() : new Service();
    options.vueComponentObject = options.vueComponentObject || vueComponentObject;
    // set element of the form
    const components = options.components || [
      {
        id,
        title,
        name,
        root: true,
        component: BodyFormComponent,
      },
    ];
    options.perc = options.layer.getFormPercentage() !== null ? options.layer.getFormPercentage() : options.perc;
    // initialize component
    this.init(options);
    this.getService().addComponents(components);
    this.getService().setComponent(components[0].component);
  }

  /**
   * Used to add component to form body
   * @param component
   */
  addBodyFormComponent({ component, where = 'after' } = {}) {
    this.getInternalComponent().body.components[where].push(component);
  }

  addBodyFormComponents({ components = [], where = 'after' } = {}) {
    components.forEach((component) => this.addBodyFormComponent({
      component,
      where,
    }));
  }

  addFormComponents(components = []) {
    this.getService().addComponents(components);
  }

  addFormComponent(component) {
    component && this.getService().addComponent(component);
  }

  // some utilities methods
  addDependecyComponents(components) {
    this.getService().addDependecyComponents(components);
  }

  addComponentBeforeBody(Component) {
    // this.getService().addedComponentTo('body');
    // this.insertComponentAt(1, Component);
  }

  addComponentAfterBody(Component) {
    // this.getService().addedComponentTo('body');
    // this.insertComponentAt(2, Component)
  }

  addComponentBeforeFooter() {
    // TODO
  }

  addComponentAfterFooter(Component) {
    // TODO
  }

  // overwrite father mount method.
  mount(parent, append) {
    return super.mount(parent, append)
      .then(() => {
      // set modal window to true
        GUI.setModal(true);
      });
  }

  layout() {
    this.internalComponent.reloadLayout();
  }
}

export default FormComponent;
