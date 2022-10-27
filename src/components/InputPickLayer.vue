<!-- ORIGINAL SOURCE: -->
<!-- gui/inputs/picklayer/vue/picklayer.html@v3.4 -->
<!-- gui/inputs/picklayer/vue/picklayer.js@v3.4 -->

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