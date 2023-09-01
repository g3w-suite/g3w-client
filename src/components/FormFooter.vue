<!--
  @file
  @since v3.7
-->

<template>
  <div class="form-group g3wform_footer">

    <template v-if="show">
      <slot>
        <div style="margin:3px; font-weight: bold">
          * <span v-t="'sdk.form.footer.required_fields'"></span>
          <div
            v-if   = "state.footer.message"
            :style = "[state.footer.style]"
          >{{ state.footer.message }}</div>
        </div>
        <button
          v-for               = "button in state.buttons"
          class               = "btn"
          :key                = "button.id"
          :class              = "[button.class]"
          :update             = "state.update"
          :valid              = "state.valid"
          @click.stop.prevent = "exec(button.cbk)"
          v-disabled          = "!btnEnabled(button)"
          v-t                 = "button.title"
        ></button>
      </slot>
    </template>

    <template v-else>
      <button
        v-t                = "'back'"
        class              = "btn skin-button"
        @click.stop.prevet = "backToRoot"
      ></button>
    </template>

  </div>
</template>

<script>
/**
 * @TODO remove "Vue.extend" from module export
 */
export default Vue.extend({

  /** @since 3.8.6 */
  name: 'form-footer',

  props: {

    state: {
      type: Object
    },

    backToRoot: {
      type: Function,
      default: () => {}
    },

    isRootComponent:{
      type: Function
    },

  },

  data() {

    /**
     * need toget a deep copy of buttons
     * @type {T[]}
     */
    this.originalbuttons = this.state.buttons.map(button => ({ ...button }));

    return {
      id:"footer",
      active: true,
      show: true
    };

  },

  computed: {

    enableSave() {
      return this.state.valid && this.state.update;
    },

  },

  methods: {

    exec(cbk) {
      cbk instanceof Function ? cbk(this.state.fields): (function() { return this.state.fields})();
    },

    btnEnabled(button) {
      const {enabled=true, type} = button;
      return enabled && (type !== 'save' ||  (type === 'save' && this.enableSave));
    },

    isValid() {
      return this.state.valid;
    },

  },

  watch: {

    'state.component'(component) {
      this.show = this.isRootComponent(component)
    },

    'state.update': {
      immediate: true,
      handler(value) {
        this.state.buttons.find((button, index) => {
          if (button.eventButtons && button.eventButtons.update) {
            if (button.eventButtons.update[value]) {
              this.state.buttons.splice(index,1, {
                ...button,
                ...button.eventButtons.update[value]
              })
            } else this.state.buttons.splice(index,1, this.originalbuttons[index]);
          }
        });
      }
    },

  },

  activated() {
    this.active = true;
  },

  deactivated() {
    this.active = false;
  },

});
</script>