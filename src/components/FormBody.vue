<!--
  @file
  @since v3.7
-->

<template>
<div>
  <form class="form-horizontal g3w-form">
    <div class="box-primary">
      <div class="box-body">
        <tabs v-if="hasFormStructure"
          contenttype       = "editing"
          :layerid          = "state.layerid"
          :feature          = "state.feature"
          :handleRelation   = "handleRelation"
          :addToValidate    = "addToValidate"
          :changeInput      = "changeInput"
          :removeToValidate = "removeToValidate"
          :tabs             = "state.formstructure"
          :fields           = "state.fields"
        />
        <g3w-input v-else
          _legacy            = "g3w-form"
          :state             = "state"
          :addToValidate     = "addToValidate"
          :removeToValidate  = "removeToValidate"
          :changeInput       = "changeInput"
          @changeinput       = "changeInput"
          @addinput          = "addToValidate"
          @removeinput       = "removeToValidate"
        />
      </div>
    </div>
  </form>
</div>
</template>

<script>
/**
 * @TODO remove "Vue.extend" from module export
 */
export default Vue.extend({

  /** @since 3.8.6 */
  name: 'form-body',

  props: [
    'state',
    'handleRelation'
  ],

  data() {
    return {
      show: true
    }
  },

  methods: {

    addToValidate(input) {
      this.$emit('addtovalidate', input);
    },

    removeToValidate(input){
      this.$emit('removetovalidate', input);
    },

    changeInput(input) {
      console.log('form changed');
      this.$emit('changeinput', input);
    },

  },

  computed: {

    hasFormStructure() {
      return !!this.state.formstructure;
    },

  },

});
</script>