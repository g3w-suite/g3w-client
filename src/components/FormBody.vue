<!--
  @file
  @since v3.7
-->

<template>
<div>
  <form class="form-horizontal g3w-form">
    <div class="box-primary">
      <div class="box-body">
        <template v-if="hasFormStructure">
          <tabs
            :layerid          = "state.layerid"
            :feature          = "state.feature"
            :handleRelation   = "handleRelation"
            :contenttype      = "'editing'"
            :addToValidate    = "addToValidate"
            :changeInput      = "changeInput"
            :removeToValidate = "removeToValidate"
            :tabs             = "state.formstructure"
            :fields           = "state.fields"/>
        </template>
        <template v-else>
          <g3w-form-inputs
            :state            = "state"
            :addToValidate    = "addToValidate"
            :removeToValidate = "removeToValidate"
            :changeInput      = "changeInput"
            @changeinput      = "changeInput"
            @addinput         = "addToValidate"
            @removeinput      = "removeToValidate"/>
        </template>
      </div>
    </div>
  </form>
</div>
</template>

<script>
import G3wFormInputs from 'components/InputG3WFormInputs.vue';

/**
 * @TODO remove "Vue.extend" from module export
 */
export default Vue.extend({

  /** @since 3.8.6 */
  name: 'form-body',

  props: ['state', 'handleRelation'],
  data() {
    return {
      show: true
    }
  },
  components: {
    G3wFormInputs
  },
  methods: {
    addToValidate(input) {
      this.$emit('addtovalidate', input);
    },
    removeToValidate(input){
      this.$emit('removetovalidate', input);
    },
    changeInput(input) {
      this.$emit('changeinput', input);
    }
  },
  computed: {
    hasFormStructure() {
      return !!this.state.formstructure;
    }
  }
});
</script>