<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">
    <div slot="body" v-disabled="!editable">

      <div
        class  = "g3w_input_button skin-border-color"
        @click = "onClick"
        style  = "
          border-style: solid;
          border-width: 2px;
          border-radius: 4px;
          width: 100%;
          cursor: pointer;
          text-align: center;
        "
      >
        <i :class="g3wtemplate.getFontClass('file-upload')" class="fa-2x skin-color" style="padding: 5px;">
          <input
            :id       = "mediaid"
            style     = "display:none"
            :name     = "state.name"
            :tabIndex = "tabIndex"
            :data-url = "state.input.options.uploadurl"
            :class    = "{ 'input-error-validation' : notvalid }"
            type      = "file"
          >
        </i>
      </div>

      <bar-loader :loading="loading" />

      <g3w-media :state="data">
        <div class="clearmedia" @click="clearMedia()">
          <i :class="g3wtemplate.font['trash-o']" class="g3w-icon"></i>
        </div>
      </g3w-media>

    </div>
  </baseinput>
</template>

<script>
import GUI               from 'services/gui';
import { g3wInputMixin } from 'mixins';
import G3WField          from 'components/FieldG3W.vue';

const { getUniqueDomId } = require('utils');
const { t }              = require('core/i18n/i18n.service');

const MediaField = G3WField.components.media_field;

console.assert(undefined !== MediaField, 'MediaField is undefined');

export default {

  /** @since 3.8.6 */
  name: 'input-media',

  mixins: [ g3wInputMixin ],

  components: {
    'g3w-media': MediaField
  },

  data() {
    return {
      data: {
        value: null,
        mime_type: null
      },
      mediaid: `media_${getUniqueDomId()}`,
      loading: false
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
      this.data.value = this.data.mime_type = this.state.value = null;
      this.change();
    },

  },

  created() {
    if (this.state.value) {
      this.data.value     = this.state.value.value;
      this.data.mime_type = this.state.value.mime_type;
    }
  },

  mounted() {

    const fieldName = this.state.name;

    const formData = {
      name: fieldName,
      csrfmiddlewaretoken: this.$cookie.get('csrftoken')
    };

    this.$nextTick(() => {
      $(`#${this.mediaid}`)
        .fileupload({
          dataType: 'json',
          formData,
          start:  () => { this.loading = true; },
          always: () => { this.loading = false; },
          fail:   () => { GUI.notify.error(t("info.server_error")); },
          done:   (e, data) => {
            const response = data.result[fieldName];
            if (response) {
              this.data.value     = response.value;
              this.data.mime_type = response.mime_type;
              this.state.value    = this.data;
              this.change();
            }
          },
        });
    });

  },

  beforeDestroy() {
    $(`#${this.mediaid}`).fileupload('destroy');
  },

};
</script>