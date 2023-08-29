<!--
  @file
  @since v3.7
-->

<template>
  <div class="form-group" v-if="state.visible">
    <!-- INPUT LABEL -->
    <slot name="label">
      <label :for="state.name" v-disabled="!editable" class="col-sm-12 control-label">{{ state.label }}
        <span v-if="state.validate && state.validate.required">*</span>
        <i
          v-if   = "showhelpicon"
          :class ="g3wtemplate.font['info']"
          class  = "skin-color"
          style  = "margin-left: 3px; cursor: pointer"
          @click = "showHideHelp"
        ></i>
        <slot name="label-action"></slot>
      </label>
    </slot>

    <div class="col-sm-12">

      <!-- LOADING BAR -->
      <slot name="loading">
        <div
          v-if="'loading' === loadingState"
          style="position:relative; width: 100%"
          slot="loading"
        >
          <bar-loader loading="true" />
        </div>
      </slot>

      <slot name="body"></slot>

      <!-- ERROR MESSAGES -->
      <slot name="message">
        <p
          v-if      = "notvalid"
          class     = "g3w-long-text error-input-message"
          style     = "margin: 0"
          v-html    = "state.validate.message"
        ></p>
        <p
          v-else-if = "state.info"
          style     = "margin: 0"
          v-html    = "state.info"
        ></p>
      </slot>

      <!-- HELP MESSAGE -->
      <div
        v-if        = "state.help && this.state.help.visible"
        class       = "g3w_input_help skin-background-color extralighten"
        v-html      = "state.help.message"
      ></div>

    </div>

  </div>
</template>

<script>

import { g3wInputMixin } from 'mixins';

export default {
  name: "baseinput",
  props: ['state'],
  mixins: [g3wInputMixin]
}
</script>

<style scoped>
  .control-label {
    text-align: left !important;
    padding-top: 0 !important;
    margin-bottom: 3px;
  }
</style>