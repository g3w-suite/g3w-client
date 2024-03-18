<!--
  @file
  @since v3.7
-->

<template>
  <div class="form-group" v-if="state.visible">
    <slot name="label">
      <!-- @since 3.10.0 -->
      <label
        :for="state.name"
        v-disabled="!editable"
        class="col-sm-12 control-label" v-t="state.i18nLabel ? state.label : ''">{{ state.i18nLabel ? '' : state.label }}
        <span v-if="state.validate && state.validate.required">*</span>
        <i
          v-if="showhelpicon"
          :class="g3wtemplate.font['info']"
          class="skin-color"
          style="margin-left: 3px; cursor: pointer"
          @click.stop="showHideHelp">
        </i>
        <slot name="label-action"></slot>
      </label>
    </slot>
    <div class="col-sm-12">
      <slot name="loading">
        <div style="position:relative; width: 100%" slot="loading" v-if="loadingState === 'loading'">
          <bar-loader loading="true"/>
        </div>
      </slot>
      <slot name="body"></slot>
      <slot name="message">
        <p v-if="notvalid" class="g3w-long-text error-input-message" style="margin: 0" v-html="state.validate.message"></p>
        <p v-else-if="state.info" style="margin: 0 " v-html="state.info"></p>
      </slot>
      <div class="g3w_input_help skin-background-color extralighten" v-if="state.help && this.state.help.visible" v-html="state.help.message">
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