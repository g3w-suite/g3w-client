<!--
  @file
  @since v3.7
-->

<template>
  <g3w-input :state="state">
    <template #input-body="{ change, tabIndex, editable, notvalid }">
      <div>
        <span
          :class = "g3wtemplate.font['crosshairs']"
          class  = "skin-color icon-picklayer"
        ></span>
        <input
          @input     = "change"
          @click     = "pickLayer"
          @blur      = "unpick"
          style      = "width: 100%;"
          :style     = "{ cursor: (editable ? 'pointer': null) }"
          class      = "form-control"
          readonly   = "readonly"
          :tabIndex  = "tabIndex"
          v-disabled = "!editable"
          :class     = "{ 'input-error-validation' : notvalid }"
          v-model    = "state.value"
        >
      </div>
    </template>
  </g3w-input>
</template>

<script>
export default {

  /** @since 3.8.6 */
  name: 'input-picklayer',

  props: {
    state: {
      type: Object,
      required: true,
    },
  },

  methods: {

    pickLayer() {
      this.pickservice
        .pick()
        .then(value => this.state.value = value)
        .catch(console.warn)
    },

    unpick() {
      setTimeout(() => !this.pickservice.isPicked() && this.pickservice.unpick(), 200)
    },

  },

  created() {
    this.pickservice = this.$parent.createInputService('picklayer', this.state.input.options);
  },

  beforeDestroy() {
    this.pickservice.clear();
    this.pickservice = null;
  },

};
</script>

<style scoped>
  .icon-picklayer {
    left: 0;
    top: 7px;
    position: absolute;
  }
</style>