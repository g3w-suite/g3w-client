<template>
  <div class="form-group g3wform_footer">
    <template v-if="show">
      <slot>
        <div style="margin:3px; font-weight: bold">
          * <span  v-t="'sdk.form.footer.required_fields'"></span>
          <div v-if="state.footer.message" :style="[state.footer.style] ">{{ state.footer.message }}</div>
        </div>
        <button v-for="button in state.buttons" class="btn "
                :class="[button.class]"
                @click.stop.prevent="exec(button.cbk)"
                v-disabled="!btnEnabled(button)" v-t="button.title">
        </button>
      </slot>
    </template>
    <template v-else>
      <button v-t="'back'" class="btn skin-button" @click.stop.prevet="backToRoot"></button>
    </template>
  </div>
</template>

<script>
  export default {
    name: "footer",
    props: {
      state: {
        type: Object,
      },
      backToRoot: {
        type: Function,
        default: () => {},
      },
      isRootComponent: {
        type: Function,
      },
    },
    data() {
      return {
        id: 'footer',
        active: true,
        show: true,
      };
    },
    methods: {
      exec(cbk) {
        cbk instanceof Function ? cbk(this.state.fields) : (function () { return this.state.fields; }());
      },
      btnEnabled(button) {
        const { enabled = true, type } = button;
        return enabled && (type !== 'save' || (type === 'save' && this.isValid()));
      },
      isValid() {
        return this.state.valid;
      },
      _enterEventHandler(evt) {
        if (evt.which === 13) {
          evt.preventDefault();
          const domEL = $(this.$el);
          if (domEL.is(':visible') && this.isValid() && this.active) domEL.find('button').click();
        }
      },
    },
    watch: {
      'state.component': function (component) {
        this.show = this.isRootComponent(component);
      },
    },
    activated() {
      this.active = true;
    },
    deactivated() {
      this.active = false;
    },
    async mounted() {
      await this.$nextTick();
      document.addEventListener('keydown', this._enterEventHandler);
    },
    beforeDestroy() {
      document.removeEventListener('keydown', this._enterEventHandler);
    }
  }
</script>

<style scoped>

</style>