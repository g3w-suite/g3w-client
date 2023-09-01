<!--
  @file
  @since v3.7
-->

<template>
  <div class="g3wform_content" style="position: relative">

    <bar-loader :loading="state.loading" />

    <!-- FORM HEADER -->
    <g3wformheader
      ref          = "g3wformheader"
      :currentid   = "state.currentheaderid"
      :headers     = "state.headers"
      :update      = "state.update"
      :valid       = "state.valid"
      @resize-form = "resizeForm"
      @clickheader = "switchComponent"
    />

    <!-- FORM BODY -->
    <div class="g3wform_body" ref="g3wform_body">

      <component
      v-for        = "component in body.components.before"
      :fields      = "state.fields"
      :is          = "component"
      />

      <keep-alive>
        <component
          :handleRelation   = "handleRelation"
          @hook:activated   = "reloadLayout"
          @addtovalidate    = "addToValidate"
          @removetovalidate = "removeToValidate"
          @changeinput      = "changeInput"
          :state            = "state"
          :is               = "state.component"
        />
      </keep-alive>

      <component
        v-for   = "component in body.components.after"  
        :fields = "state.fields"
         :is    = "component"
      />

    </div>

    <!-- FORM FOOTER -->
    <g3w-form-footer
      ref              = "g3w_form_footer"
      :isRootComponent = "isRootComponent"
      :backToRoot      = "backToRoot"
      :state           = "state"
    />

  </div>
</template>

<script>
import HeaderFormComponent from 'components/FormHeader.vue';
import G3wFormFooter       from 'components/FormFooter.vue';

export default {

  /** @since 3.8.6 */
  name: 'g3w-form',

  data() {
    return {
      state: {},
      switchcomponent: false,
      body: {
        components: {
          before: [],
          after: []
        }
      }
    }
  },

  components: {
    g3wformheader: HeaderFormComponent,
    G3wFormFooter,
  },

  transitions: {
    'addremovetransition': 'showhide',
  },

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
      this.$options.service.disableComponent({ id, disabled });
    },

    resizeForm(perc) {
      this.$options.service.setCurrentFormPercentage(perc)
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

    removeToValidate(input) {
      this.$options.service.removeToValidate(input);
    },

    // set layout
    reloadLayout() {
      const height = $(this.$el).height();
      if (!height) {
        return;
      }
      const footerDOM    = $(this.$refs.g3w_form_footer.$el);
      const bodyFromDOM  = $(this.$refs.g3wform_body);
      const footerHeight = footerDOM.height() ? footerDOM.height() + 50 : 50;
      const bodyHeight   = height - ($(this.$refs.g3wformheader.$el).height() +  footerHeight);
      bodyFromDOM.height(bodyHeight);
    },

  },

  async updated() {
    await this.$nextTick();
    if (this.switchcomponent) {
     setTimeout(()=> this.switchcomponent = false, 0);
    }
  },

  created() {
    this.$options.service.getEventBus().$on('set-main-component',   () => { this.switchComponent(0); });
    this.$options.service.getEventBus().$on('component-validation', ({ id, valid }) => { this.$options.service.setValidComponent({ id, valid }); });
    this.$options.service.getEventBus().$on('addtovalidate',        this.addToValidate);
    this.$options.service.getEventBus().$on('disable-component',    this.disableComponent);
  },

  mounted() {
    // check if is valid form (it used by footer component)
    this.$options.service.isValid();
    this.$options.service.setReady(true);
  },

  beforeDestroy() {
    this.$options.service.clearAll();
  },

};
</script>