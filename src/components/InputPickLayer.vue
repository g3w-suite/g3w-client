<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">
    <div slot="body">
      <span style="left: 0; top: 7px; position: absolute"  :class="g3wtemplate.font['crosshairs']" class="skin-color"></span>
      <input
        @input="change"
        @click="pickLayer"
        @blur="unpick"
        style="width: 100%;"
        :style="{cursor: editable ? 'pointer': null}"
        class="form-control"
        readonly="readonly"
        :tabIndex="tabIndex"
        v-disabled="!editable"
        :class="{'input-error-validation' : notvalid}"
        v-model="state.value">
    </div>
  </baseinput>
</template>

<script>
const Input = require('gui/inputs/input');
const Service = require('gui/inputs/picklayer/service');

export default {

  /** @since 3.8.6 */
  name: 'input-picklayer',

  mixins: [Input],
  methods: {
    pickLayer() {
      this.pickservice.pick()
        .then(value => this.state.value = value).catch(()=>{})
    },
    unpick() {
      setTimeout(() => !this.pickservice.isPicked() && this.pickservice.unpick(), 200)
    }
  },
  created() {
    this.pickservice = new Service(this.state.input.options)
  },
  beforeDestroy() {
    this.pickservice.clear();
    this.pickservice = null;
  }
};
</script>