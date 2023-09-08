<!--
  @file
  @since v3.7
-->

<template>
  <g3w-input :state="state">
    <template #body="{ tabIndex, editable, notvalid }">
      <div v-disabled="!editable">

        <div
          class  = "g3w_input_button skin-border-color"
          @click = "onClick"
        >
          <i
            :class = "g3wtemplate.getFontClass('file-upload')"
            class  = "fa-2x skin-color"
            style  = "padding: 5px;"
          >
            <input
              :id       = "mediaid"
              style     = "display: none;"
              :name     = "state.name"
              :tabIndex = "tabIndex"
              :data-url = "state.input.options.uploadurl"
              :class    = "{ 'input-error-validation' : notvalid }"
              type      = "file"
            >
          </i>
        </div>

        <bar-loader :loading="loading" />

        <g3w-field :state="data" _legacy="g3w-mediafield">
          <div class="clearmedia" @click="clearMedia()">
            <i :class="g3wtemplate.font['trash-o']" class="g3w-icon"></i>
          </div>
        </g3w-field>

      </div>
    </template>
  </g3w-input>
</template>

<script>
import GUI               from 'services/gui';

const { getUniqueDomId } = require('core/utils/utils');
const { t }              = require('core/i18n/i18n.service');

export default {

  /** @since 3.8.6 */
  name: 'input-media',

  props: {
    state: {
      type: Object,
      required: true,
    },
  },

  data() {
    return {
      data: {
        value:     null,
        mime_type: null,
      },
      mediaid:     `media_${getUniqueDomId()}`,
      loading:     false,
    }
  },

  methods: {

    onClick(e) {
      document.getElementById(this.mediaid).click();
    },

    createImage(file, field) {
      const reader  = new FileReader();
      reader.onload = function(e) { field.value = e.target.result; };
      reader.readAsDataURL(file);
    },

    checkFileSrc(value) {
      if (_.isNil(value)) {
        value = ''
      }
      return value
    },

    clearMedia() {
      this.data.value     = null;
      this.data.mime_type = null;
      this.state.value    = null;
      this.$parent.change();
    },

  },

  created() {
    if (this.state.value) {
      this.data.value     = this.state.value.value;
      this.data.mime_type = this.state.value.mime_type;
    }
  },

  async mounted() {

    const name                = this.state.name;
    const csrfmiddlewaretoken = this.$cookie.get('csrftoken');

    await this.$nextTick();

    $(`#${this.mediaid}`)
      .fileupload({
        dataType: 'json',
        formData: {
          name,
          csrfmiddlewaretoken
        },
        start:  () => { this.loading = true; },
        always: () => { this.loading = false; },
        fail:   () => { GUI.notify.error(t("info.server_error")); },
        done:   (e, data) => {
          const response = data.result[name];
          if (response) {
            this.data.value     = response.value;
            this.data.mime_type = response.mime_type;
            this.state.value    = this.data;
            this.$parent.change();
          }
        },
      });
  },

  beforeDestroy() {
    $(`#${this.mediaid}`).fileupload('destroy');
  },

};
</script>

<style scoped>
  .g3w_input_button {
    border-style: solid;
    border-width: 2px;
    border-radius: 4px;
    width: 100%;
    cursor: pointer;
    text-align: center;
  }
</style>