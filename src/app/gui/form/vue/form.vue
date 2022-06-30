<template>
  <div class="g3wform_content" style="position: relative">
    <bar-loader :loading="state.loading"></bar-loader>
    <g3wformheader ref="g3wformheader"
      :currentid="state.currentheaderid"
      :headers="state.headers"
      @resize-form="resizeForm"
      @clickheader="switchComponent">
    </g3wformheader>
    <div class="g3wform_body" ref="g3wform_body">
      <component :fields="state.fields" v-for="component in body.components.before" :is="component"></component>
      <keep-alive>
        <component :handleRelation="handleRelation"
          @hook:activated="reloadLayout"
          @addtovalidate="addToValidate"
          @changeinput="changeInput"
          :state="state"
          :is="state.component">
        </component>
      </keep-alive>
      <component :fields="state.fields" v-for="component in body.components.after" :is="component"></component>
    </div>
    <g3w-form-footer ref="g3w_form_footer" :isRootComponent="isRootComponent" :backToRoot="backToRoot" :state="state"></g3w-form-footer>
  </div>

</template>

<script>
  import GUI from 'gui/gui';
  import Component from 'gui/vue/component';
  import Service from 'gui/form/formservice';
  import G3wFormFooter from 'gui/form/components/footer.vue';
  import HeaderFormComponent from 'gui/form/components/header.vue';
  import BodyFormComponent from 'gui/form/components/body.vue';
  export default {
    name: "form",
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
</script>

<style scoped>

</style>