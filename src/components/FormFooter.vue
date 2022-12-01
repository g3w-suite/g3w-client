<!-- ORIGINAL SOURCE: -->
<!-- gui/form/components/footer/vue/footer.html@v3.4 -->
<!-- gui/form/components/footer/vue/footer.js@v3.4 -->

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
                :update="state.update"
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
// TODO: remove "Vue.extend" from module export
export default Vue.extend({
  props: {
    state: {
      type: Object
    },
    backToRoot: {
      type: Function,
      default: ()=>{}
    },
    isRootComponent:{
      type: Function
    }
  },
  data() {
    return {
      id:"footer",
      active: true,
      show: true
    }
  },
  computed: {
    enableSave(){
      return this.state.valid && this.state.update;
    }
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
    'state.component'(component){
      this.show = this.isRootComponent(component)
    }
  },
  activated(){
    this.active = true;
  },
  deactivated() {
    this.active = false;
  }
});
</script>