<!--
  @file
  @since v3.7
-->

<template>
  <form class="form-horizontal g3w-form">
    <div class="box-primary">
      <div class="box-body">
        <template v-for="field in state.fields">
          <g3w-input
            :state="field"
            :removeToValidate="removeToValidate"
            :addToValidate="addToValidate"
            :changeInput="changeInput"
            @addToValidate="addToValidate"
            @changeInput="changeInput"/>
        </template>
      </div>
      <div
        v-if="show_required_field_message"
        id="g3w-for-inputs-required-inputs-message"
      >
        <span class="hide-cursor-caret-color">*</span>
        <span
          class="hide-cursor-caret-color"
          v-t="'sdk.form.footer.required_fields'">
        </span>
      </div>

    </div>
  </form>
</template>

<script>
import G3wInput from 'components/InputG3W.vue';

export default {
  name: "g3w-form-inputs",
  props: {
    state: {
      type: Object,
      default: {
        fields: []
      }
    },
    addToValidate: {
      type: Function
    },
    removeToValidate: {
      type: Function,
    },
    changeInput: {
      type: Function
    },
    show_required_field_message: {
      type: Boolean,
      default: false
    },

  },
  components: {
    G3wInput
  }
};
</script>

<style scoped>
  #g3w-for-inputs-required-inputs-message {
    margin-bottom:5px;
    font-weight: bold;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .box-body {
    padding: 5px;
  }
</style>
