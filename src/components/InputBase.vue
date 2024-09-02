<!--
  @file
  @since v3.7
-->

<template>
  <div
    v-if  = "state.visible"
    class = "form-group"
  >
    <!-- SLOT LABEL -->
    <slot name = "label">
      <!-- @since 3.10.0 -->
      <label
        :for       = "state.name"
        v-disabled = "!editable"
        class      = "col-sm-12 control-label"
      >
        <span v-if = "state.i18nLabel" v-t = "state.label"></span>
        <span v-else>{{ state.label }}</span>
        <span v-if = "state.validate && state.validate.required">*</span>
        <i
          v-if        = "showhelpicon"
          :class      = "g3wtemplate.font['info']"
          class       = "skin-color"
          style       = "margin-left: 3px; cursor: pointer"
          @click.stop = "showHideHelp">
        </i>
        <slot name = "label-action"></slot>
      </label>
    </slot>

    <!-- @since 3.11.0 RELATION FIELD -->
    <div
      v-if   = "state.relationField"
      style  = "color: var(--skin-warning); padding: 3px 0 3px 15px"
    >
      <span :class = "g3wtemplate.getFontClass('warning')"></span>
      <span v-t = "'sdk.relations.field'"></span>
    </div>

    <div class = "col-sm-12">

      <!-- SLOT LOADING -->
      <slot name = "loading">
        <div
          v-if  = "loadingState === 'loading'"
          style = "position:relative; width: 100%"
          slot  = "loading"
        >
          <bar-loader loading = "true"/>
        </div>
      </slot>

      <!-- SLOT BODY -->
      <slot name = "body"></slot>

      <!-- SLOT MESSAGE -->
      <slot name = "message">
        <p
          v-if   = "notvalid"
          class  = "g3w-long-text error-input-message"
          style  = "margin: 0"
          v-html = "state.validate.message">
        </p>
        <p
          v-else-if = "state.info"
          style     = "margin: 0 "
          v-html    = "state.info">
        </p>
      </slot>

      <div
        v-if   = "state.help && this.state.help.visible"
        v-html = "state.help.message"
        class  = "g3w_input_help skin-background-color extralighten">
      </div>

    </div>
  </div>
</template>

<script>
import { baseInputMixin as BaseInputMixin } from 'mixins';

export default {
  name: "InputBase",
  props: ['state'],
  ...BaseInputMixin
}
</script>

<style scoped>
  .control-label {
    text-align: left !important;
    padding-top: 0 !important;
    margin-bottom: 3px;
  }
</style>